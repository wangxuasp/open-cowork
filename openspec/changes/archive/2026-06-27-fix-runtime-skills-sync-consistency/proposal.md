## Why

生产环境中存在两个 skills 目录：`resources/skills`（安装包内置、只读）与 `%AppData%/omni-worker/claude/skills`（运行时工作目录）。用户将自定义 skill 复制进工程 `.claude/skills` 并打包后，每次 Agent 提问都会触发同步与 Teamcenter URL 替换，导致运行时目录中**用户复制的 skill**反复被删除、重建或 materialize，`skillsSignature` 变化并重建 pi session。内置 docx/pptx 等稳定 skill 不受影响，问题集中在用户自行添加的 skill 上。

## What Changes

- 修复 `shouldRefreshRuntimeSkill` 与 `syncBuiltinSkillsToRuntimeDir` 的刷新逻辑，避免「已 materialize 的 skill 因存在 `.open-cowork-skill-template` 而在每次会话前被强制回滚到 symlink 再重新 materialize」的循环
- 将 builtin / user / configured 三类 skill 的同步策略改为**幂等**：仅在源目录内容变化（或目标缺失/损坏）时才写入运行时目录
- `applyTeamcenterBaseUrlToSkillDescriptions` 仅在模板或 URL 配置实际变化时修改 `SKILL.md`，避免无意义的 mtime 抖动
- `syncConfiguredSkillsToRuntimeDir` 不再在每次 `run()` 时无条件删除并重建已存在的目录/链接
- 明确并文档化两个目录的职责：`resources/skills` 为打包只读源，`userData/claude/skills` 为 SDK 运行时入口（可含 symlink、materialized 副本与 Teamcenter 渲染结果）
- 增加单元/集成测试，覆盖「连续两次 run 后 runtime 目录与用户自定义 skill 内容保持一致」

## Capabilities

### New Capabilities

- `runtime-skills-sync`: 定义 builtin、user、configured skill 到运行时目录的同步规则、刷新条件与 Teamcenter materialize 的幂等行为，确保 `resources/skills` 与 `userData/claude/skills` 在稳定状态下保持一致且不会每次提问都变动

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- **Agent 运行时**：`src/main/claude/agent-runner.ts`（`syncBuiltinSkillsToRuntimeDir`、`syncUserSkillsToAppDir`、`syncConfiguredSkillsToRuntimeDir`、`shouldRefreshRuntimeSkill`、`computeRuntimeSkillsContentSignature`）
- **Teamcenter 运行时**：`src/main/skills/teamcenter-skill-runtime.ts`（materialize 与 URL 替换逻辑）
- **Skills 管理**：`src/main/skills/skills-manager.ts`（全局 skills 导入与 storage watcher，需与 runtime 策略对齐）
- **测试**：`tests/agent-runner-pi.test.ts` 及新增针对 sync 幂等性的测试文件
- **文档**：构建/打包说明中补充 skills 目录职责与用户自定义 skill 的推荐放置方式
