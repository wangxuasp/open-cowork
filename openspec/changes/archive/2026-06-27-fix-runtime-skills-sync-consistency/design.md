## Context

Omni Worker 的 Agent 通过 `CLAUDE_CONFIG_DIR` 指向 `%AppData%/omni-worker/claude`，skills 实际加载路径为 `%AppData%/omni-worker/claude/skills`（`userData/claude/skills`）。安装包内置 skill 位于 `process.resourcesPath/skills`（由 `electron-builder` 从工程 `.claude/skills` 提取）。

每次 `ClaudeAgentRunner.run()` 会依次执行：

1. `syncBuiltinSkillsToRuntimeDir` — 从 `resources/skills` 向 runtime 目录 symlink/copy
2. `syncUserSkillsToAppDir` — 从 `~/.claude/skills` 导入
3. `syncConfiguredSkillsToRuntimeDir` — 从用户配置的 global skills 路径同步
4. `applyTeamcenterBaseUrlToSkillDescriptions` — 对含 Teamcenter 占位符的 skill 做 URL 替换，并将 symlink **materialize** 为实体目录，写入 `.open-cowork-skill-template`

**根因循环：** `shouldRefreshRuntimeSkill` 在目标目录存在 `.open-cowork-skill-template` 时返回 `true`，导致步骤 1 在每次提问前删除已 materialize 的目录并重新从 builtin 建立 symlink；步骤 4 再次 materialize 并改写 `SKILL.md`，使 `computeRuntimeSkillsContentSignature` 变化，触发 pi session 重建。内置 docx/pptx 通常无 Teamcenter 占位符，不会进入该循环；用户自行复制进 `.claude/skills` 并打包的 skill（尤其含 `{BASE_URL}` 等占位符）会反复变动。

此外 `syncConfiguredSkillsToRuntimeDir` 在 configured 路径与 runtime 路径不同时，**每次 run 都无条件删除目标并重建 symlink**，也会破坏已 materialize 的副本。

## Goals / Non-Goals

**Goals:**

- 连续两次 Agent 提问后，`userData/claude/skills` 中用户自定义 skill 的目录结构与 `SKILL.md` 内容保持稳定（无配置/源变更前提下）
- `resources/skills` 作为 builtin 只读源；runtime 目录作为 SDK 工作副本，允许 symlink、materialized 副本与 Teamcenter 渲染结果共存
- 同步操作幂等：仅在缺失、损坏、或源内容新于目标时才写入
- Teamcenter URL 替换仅在模板或 URL 配置变化时更新 `SKILL.md`
- 覆盖 builtin / user / configured 三类来源的测试

**Non-Goals:**

- 改变用户通过 UI 选择 global skills 存储路径的产品行为
- 将 runtime 目录完全只读或禁止 materialize
- 重构 `SkillsManager` 的整体 skill 发现模型
- 解决用户手动同时修改 `resources/skills` 与 runtime 目录的冲突（安装目录只读）

## Decisions

### 1. 刷新条件：由「存在 template 即刷新」改为「源-目标内容比较」

**选择：** 重写 `shouldRefreshRuntimeSkill(sourcePath, targetPath)`（或等价 helper），在以下情况返回 `true`：

- 目标不存在或为 dangling symlink
- 目标 symlink 指向 `.asar` 内部（ENOTDIR 风险，需 copy）
- **源目录**（`resources/skills/<name>`）的 manifest 签名（如顶层 `SKILL.md` 的 size+mtime，或递归 hash）与目标不一致

**不再**因 `.open-cowork-skill-template` 存在而强制刷新。

**理由：** template 文件是 Teamcenter materialize 的正常产物，不应触发回滚。

**备选：** 保留 template 触发刷新但在 materialize 后改 symlink 为 copy 且跳过 builtin sync — 仍会在版本升级时难以合并，不如显式比较源内容。

### 2. Teamcenter materialize：先同步、后替换，且替换幂等

**选择：** 保持「先 sync 三类来源，再 `applyTeamcenterBaseUrlToSkillDescriptions`」顺序。在 `teamcenter-skill-runtime.ts` 中：

- materialize 仅在目标为 symlink 时执行
- 写 `SKILL.md` 前比较 `nextContent === currentContent`，相同则跳过写入
- `.open-cowork-skill-template` 仅在首次 materialize 或模板源变化时写入

**理由：** 避免无意义的 mtime 变化导致 `skillsSignature` 抖动。

### 3. `syncConfiguredSkillsToRuntimeDir`：增量同步

**选择：** 对每个 configured skill 条目：

- 若 runtime 中已存在**同内容**的目录或有效 symlink（指向相同 realpath），跳过
- 若源新于目标或目标损坏，才 remove + symlink/copy
- 不再在每次 run 时无条件 `rmSync` + `symlinkSync`

**理由：** 与用户观察到的「每次提问都变」直接相关。

### 4. 用户复制 skill 的推荐模型（文档）

**选择：** 文档说明：

| 场景                 | 推荐位置                                                      |
| -------------------- | ------------------------------------------------------------- |
| 随安装包分发的 skill | 工程 `.claude/skills` → 打包进 `resources/skills`             |
| 用户级自定义 skill   | `~/.claude/skills` 或 Settings 中配置的 global 路径           |
| 运行时副本           | `%AppData%/omni-worker/claude/skills`（应用管理，勿手动编辑） |

**理由：** 明确职责，减少用户直接改 runtime 目录导致的困惑。

### 5. 签名计算：排除 ephemeral 文件

**选择：** `computeRuntimeSkillsContentSignature` 继续基于 `SKILL.md`，但忽略 `.open-cowork-skill-template` 及 dotfile；若 Teamcenter 替换幂等，签名自然稳定。

**备选：** 签名基于 template 而非 materialized `SKILL.md` — 更复杂，暂不采用。

### 6. 测试策略

**选择：** 新增 `src/tests/skills/runtime-skills-sync.test.ts`（或扩展现有测试），用临时目录模拟：

- builtin 源 + runtime 目标，连续两次 sync 后目录树与 `SKILL.md` 不变
- 含 Teamcenter 占位符的 skill：两次 apply 后内容一致
- 模拟 `shouldRefreshRuntimeSkill` 在 materialize 后不再返回 true

## Risks / Trade-offs

| 风险                                             | 缓解                                                |
| ------------------------------------------------ | --------------------------------------------------- |
| 升级安装包后 builtin skill 更新未反映到 runtime  | 源-目标签名比较会在源 mtime/内容变化时触发 refresh  |
| 用户手动编辑 runtime 目录中的 materialized skill | 文档标明 runtime 为托管目录；源变更时会覆盖         |
| 签名比较仅用 mtime 可能漏检内容同 mtime 的变更   | 对 `SKILL.md` 同时比较 size；必要时比较 hash        |
| Windows symlink 权限导致 copy 回退               | 保留现有 `removePathEntryIfPresent` + copy 回退路径 |

## Migration Plan

1. 合并后，用户无需操作；下次启动 Agent 时新 sync 逻辑生效
2. 已有 runtime 目录中处于「半 symlink 半 materialize」状态的 skill 会在首次 run 时被规范化一次，之后稳定
3. 无需数据库迁移

## Open Questions

- 是否需要在 Settings UI 增加「重建 runtime skills」手动按钮 — **暂定**：不做，除非测试反馈需要；可通过删除 `%AppData%/omni-worker/claude/skills` 强制全量重建
