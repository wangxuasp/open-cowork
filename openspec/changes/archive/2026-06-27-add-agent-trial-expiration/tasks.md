## 1. 构建时注入与校验

- [x] 1.1 在 `vite.config.ts` 的 Electron main 构建配置中添加 `define: { __AGENT_TRIAL_EXPIRATION__: JSON.stringify(process.env.AGENT_TRIAL_EXPIRATION ?? '') }`
- [x] 1.2 添加 `src/main/trial/trial-config.ts`：导出 `getTrialExpirationDate(): string | null` 与 `isTrialExpired(now?: Date): boolean`（本地时区，到期日当天未过期）
- [x] 1.3 在 `scripts/pre-build-check.js` 中校验：若 `AGENT_TRIAL_EXPIRATION` 非空，格式为 `YYYY-MM-DD` 且为合法日历日，否则 fatal 退出
- [x] 1.4 为 `pre-build-check` 增加单元测试（合法/非法/未设置）

## 2. 扩展阻断机制

- [x] 2.1 扩展 `BeforeSessionRunResult`（`agent-runtime-extension.ts`）：增加 `blocked?: boolean` 与 `blockReason?: string`
- [x] 2.2 更新 `AgentRuntimeExtensionManager.beforeSessionRun`：任一扩展返回 `blocked: true` 时立即短路并返回该结果
- [x] 2.3 更新 `ClaudeAgentRunner.run()`：在 `beforeSessionRun` 后若 `blocked`，抛出带 `alreadyReportedToUser: true` 的错误（使用 `blockReason`）
- [x] 2.4 为 extension manager 阻断逻辑添加单元测试

## 3. 试用到期扩展

- [x] 3.1 创建 `src/main/trial/trial-expiration-extension.ts`：实现 `AgentRuntimeExtension`，在 `beforeSessionRun` 中调用 `isTrialExpired()`，过期则返回 `{ blocked: true, blockReason }`
- [x] 3.2 在 `src/main/index.ts` 将 `TrialExpirationExtension` 注册到 `AgentRuntimeExtensionManager`
- [x] 3.3 定义过期提示文案（含到期日占位），添加到 `src/renderer/i18n/locales/en.json` 与 `zh.json`（`trial.expired`）

## 4. 测试与文档

- [x] 4.1 添加 `trial-config` 单元测试：未配置、到期日当天、次日、非法编译值
- [x] 4.2 添加 `trial-expiration-extension` 集成测试或 agent-runner 阻断测试
- [x] 4.3 在 README 或构建文档中说明试用版构建命令示例：`AGENT_TRIAL_EXPIRATION=2026-12-31 npm run build:win`
