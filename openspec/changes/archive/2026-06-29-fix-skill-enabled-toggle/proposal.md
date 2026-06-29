## Why

Settings 中的技能开关目前只更新 `SkillsManager` 内存里的 `enabled` 字段，既不持久化到数据库，也不影响 Agent 运行时目录与 pi SDK 的 `additionalSkillPaths`。用户关闭某个内置或自定义技能后，Agent 仍能看到并调用该技能，开关形同虚设。

## What Changes

- 在 `setSkillEnabled` 时将 `enabled` 状态持久化到 SQLite `skills` 表，并在启动/加载技能时从数据库恢复
- 将 `getActiveSkills()`（或等价的 enabled 查询）接入 Agent 执行路径：仅同步 **已启用** 的技能到 runtime 目录
- 禁用技能时从 runtime 目录移除对应条目（不删除源目录中的 skill 文件）
- 将 enabled 技能列表纳入 `skillsSignature`，开关变化后重建 pi session，使 Agent 立即反映新状态
- 实现并注入 `SkillsAdapter`，让 `ClaudeAgentRunner` 通过 `SkillsManager` 获取 enabled 状态，而非始终全量同步
- 为上述行为补充单元测试与集成测试

## Capabilities

### New Capabilities

- `skill-enabled-state`: 定义技能 enabled 状态的持久化、加载、UI 切换与 Agent 查询契约

### Modified Capabilities

- `runtime-skills-sync`: 同步到 runtime 目录时必须尊重 enabled 状态；禁用技能不得出现在 SDK 加载路径中；`skillsSignature` 在 enabled 列表变化时必须变化以触发 session 重建

## Impact

- **Skills 管理**: `src/main/skills/skills-manager.ts`（`setSkillEnabled`、`loadBuiltinSkills`、`loadSkillsFromDirectory`、DB 读写）
- **Agent 运行时**: `src/main/claude/agent-runner.ts`（`sync*SkillsToRuntimeDir`、`resolveSkillPaths`、`skillsSignature`）
- **适配层**: `src/main/skills/skills-adapter.ts`（新增实现并注入）
- **会话**: `src/main/session/session-manager.ts`（传入 `SkillsAdapter`）
- **IPC**: `src/main/index.ts`（`skills.setEnabled` 可能需确保 save + invalidate）
- **数据库**: `src/main/db/database.ts`（`skills` 表从「future use」变为实际读写）
- **测试**: `tests/skills-manager-*.test.ts`、`tests/agent-runner-pi.test.ts` 或新增 `src/tests/skills/skill-enabled-toggle.test.ts`
- **规范**: `openspec/specs/runtime-skills-sync/spec.md`（delta）、新增 `openspec/specs/skill-enabled-state/spec.md`
