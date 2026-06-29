## Context

当前技能开关链路断裂于三处：

1. **`SkillsManager.setSkillEnabled`** 只改内存，不调用 `saveSkill()`；`loadBuiltinSkills` / `loadSkillsFromDirectory` 启动时一律 `enabled: true`，不读 SQLite `skills` 表（该表标注为 future use）。
2. **`getActiveSkills()`** 已实现 enabled 过滤，但全仓库无调用方。
3. **`ClaudeAgentRunner`** 在每次 query 前通过 `syncBuiltinSkillsToRuntimeDir` / `syncUserSkillsToAppDir` / `syncConfiguredSkillsToRuntimeDir` 将**全部**技能目录写入 runtime，再经 `DefaultResourceLoader({ additionalSkillPaths: [appSkillsDir] })` 交给 pi SDK；`SkillsAdapter` 在 `SessionManager` 中传 `undefined`。

插件级开关（`PluginRuntimeService.getEnabledRuntimePlugins`）已生效，本变更仅覆盖 Settings → Skills 列表中的内置/自定义/MCP 技能开关。

## Goals / Non-Goals

**Goals:**

- UI 开关的 `enabled` 状态持久化，重启后保持
- 仅 **enabled** 的技能出现在 Agent runtime 目录与 SDK 加载路径
- 禁用技能后，下一次 Agent query 不再向模型暴露该 skill（含 pi session 重建）
- 与现有 `runtime-skills-sync` 幂等同步策略兼容，不破坏 Teamcenter materialize 逻辑
- 补充可自动化验证的测试

**Non-Goals:**

- 不改变插件级 `componentsEnabled.skills` 开关逻辑
- 不删除源目录中的 skill 文件（仅移除 runtime 副本）
- 不重构 `SkillsManager` 的整体发现模型或 UI
- 不为 MCP skill 实现真实进程启停（现有 `stopMcpServer` 仍为 TODO）

## Decisions

### 1. 以 SQLite `skills` 表为 enabled 状态唯一持久化来源

**选择：** `setSkillEnabled` 更新内存后调用 `saveSkill()`；加载技能目录时用 `id` 查表，无记录则默认 `enabled: true` 并 upsert。

**理由：** 表结构已存在（`enabled INTEGER`），无需新 migration。按 `id`（如 `builtin-pdf`、`global-my-skill`）与现有 `loadedSkills` 键一致。

**备选：** 写入 `SKILL.md` frontmatter 或 sidecar JSON — 会污染用户 skill 目录，否决。

### 2. 扩展 `SkillsAdapter` 为 enabled 查询接口

**选择：** 在 `skills-adapter.ts` 增加：

```typescript
export interface SkillsAdapter {
  isSkillEnabled(source: SkillSource, directoryName: string): boolean;
  getEnabledSkillSignature(): string; // 稳定、排序后的 enabled id 列表 JSON
}
type SkillSource = 'builtin' | 'user' | 'configured';
```

由 `createSkillsAdapter(skillsManager)` 工厂实现；`SessionManager.createClaudeAgentRunner` 注入该实例。

**理由：** `getSkillPaths()` 单独无法表达 per-skill 过滤；runtime 目录仍是单一 `appSkillsDir`，过滤发生在 sync 阶段而非多路径。

**备选：** 让 `AgentRunner` 直接依赖 `SkillsManager` — 耦合更重，否决。

### 3. Sync 阶段按 enabled 过滤，禁用时主动 prune

**选择：** 在三个 `sync*SkillsToRuntimeDir` 循环中：

- `directoryName` → `source` + `id` 映射（与 `SkillsManager` 一致：`builtin-${dir}`、`global-${dir}` 等）
- 若 **disabled**：若 runtime 中存在该目录则 `removePathEntryIfPresent`，**跳过** sync
- 若 **enabled**：保持现有幂等 sync 逻辑不变

同步完成后，对 runtime 目录做一次 **prune pass**：删除其下不在当前 enabled 集合中的条目（防止历史残留）。

**理由：** 与 `runtime-skills-sync` 现有「仅源变化时写入」策略正交；禁用等价于「该 skill 不应出现在 runtime」。

### 4. `skillsSignature` 纳入 enabled 状态

**选择：** 在 `buildPiSessionRuntimeSignature` 旁的 `skillsSignature` JSON 中增加 `enabledSignature: skillsAdapter.getEnabledSkillSignature()`。

**理由：** 开关变化必须使 pi session 失效，否则 `DefaultResourceLoader` 缓存的旧 skill 列表会继续生效。

**注意：** 仅 enabled 变化、源文件不变时也会重建 session — 这是预期行为。

### 5. 保留 `getActiveSkills()` 并供 Adapter 复用

**选择：** `getActiveSkills` 作为 enabled 技能权威列表；Adapter 的 `isSkillEnabled` 查 `loadedSkills` 中对应 id 的 `enabled` 字段（加载时已 merge DB）。

**理由：** 避免重复过滤逻辑；未来 project-level skills 也可在此扩展。

### 6. 目录名与 skill id 映射规则

| 来源                      | 目录名 `dir`             | `loadedSkills` id                                 |
| ------------------------- | ------------------------ | ------------------------------------------------- |
| builtin                   | `resources/skills/<dir>` | `builtin-<dir>`                                   |
| user (`~/.claude/skills`) | `<dir>`                  | 无独立 id 时按 `global-<dir>` 或新建 `user-<dir>` |

**选择：** user skills 在 `loadSkillsFromDirectory` 中统一使用 `global-<dir>`（与现有一致）；sync 时 user 目录用 `user` source 映射到 `global-<dir>`（因 user import 与 global 可能重名，以 `loadedSkills` 中 `name` 匹配为准）。

**简化实现：** `isSkillEnabled` 接受 `(source, directoryName)`，内部构造候选 id 列表 `[`${source}-${directoryName}`, `builtin-${directoryName}`, `global-${directoryName}`]`，在 `loadedSkills` 中查找；找到则返回其 `enabled`，找不到则默认 `true`（未知目录不阻断 sync）。

### 7. IPC `skills.setEnabled` 行为

**选择：** `setSkillEnabled` → `saveSkill` → `invalidateSkillsSetup`（已有）不变；可选增加 `skillsManager` 向 renderer 广播 `skills.enabledChanged`（非必须，UI 已 optimistic refresh）。

## Risks / Trade-offs

| 风险                                                                        | 缓解                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 禁用后 runtime 中 Teamcenter materialize 副本被删，再启用需重新 materialize | 可接受；启用后下次 query 会重新 sync + apply URL                             |
| user/global 目录名与 builtin 重名时 enabled 状态歧义                        | 以 `loadedSkills` id 精确匹配；prune 时按目录名处理，enabled 查表用多候选 id |
| 默认 `true` 对未知目录仍 sync                                               | 与现行为一致；仅已注册 skill 受开关控制                                      |
| pi session 因开关频繁重建                                                   | 开关为低频操作，可接受                                                       |
| DB 与磁盘 skill 列表漂移（DB 有记录但目录已删）                             | `listSkills` 以磁盘为准；DB 孤儿行无害，加载时跳过                           |

## Migration Plan

1. 部署后首次启动：无 DB 记录的技能默认 enabled，行为与现网一致
2. 用户曾在本会话内 toggled 但未持久化的状态会丢失 — 可接受（此前本就不持久）
3. 回滚：恢复旧代码后所有技能重新全量 sync，无数据损坏

## Open Questions

- user skills 是否应使用独立 `user-<dir>` id 而非 `global-<dir>` — **暂定**保持现有 id scheme，减少迁移面
- 是否在 Settings UI 增加「全部禁用/启用」批量操作 — **暂定**不做
