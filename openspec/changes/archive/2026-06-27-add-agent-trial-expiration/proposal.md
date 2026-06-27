## Why

Omni Worker 需要支持面向客户或内部试用的限时发行版本：在编译打包前设定 Agent 的试运行到期日，到期后禁止继续运行并明确提示用户。这样可以控制试用范围，避免无限期使用未授权构建，而无需在运行时依赖外部授权服务。

## What Changes

- 新增构建时环境变量 `AGENT_TRIAL_EXPIRATION`（格式 `YYYY-MM-DD`），在 `vite build` / `electron-builder` 前设置，将到期日编译进应用
- 未设置该变量时，行为与现有一致（无试用限制，适用于正式版与本地开发）
- Agent 每次启动会话运行前检查当前日期是否已超过到期日（按本地日历日，到期日当天仍可用，次日 0 点起不可用）
- 若已过期：阻止 Agent 运行，在聊天界面展示本地化错误消息，并发送 `error` 事件
- 扩展 `BeforeSessionRunResult` 与 `AgentRuntimeExtensionManager`，支持扩展返回 `blocked` 以统一阻断机制（供试用检查及其他扩展复用）
- 在 `pre-build-check` 中校验：若设置了试用到期日，格式必须合法
- 更新构建文档，说明如何为试用版设置到期日

## Capabilities

### New Capabilities

- `agent-trial-expiration`: 构建时注入试用到期日，运行时拦截已过期的 Agent 会话启动并提示用户

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- **构建流程**：`vite.config.ts`（`define` 注入）、`scripts/pre-build-check.js`（格式校验）、`package.json` 构建脚本说明
- **运行时**：`src/main/extensions/agent-runtime-extension.ts`、`agent-runtime-extension-manager.ts`、新建试用检查扩展或模块
- **Agent 执行**：`src/main/claude/agent-runner.ts`（`beforeSessionRun` 后处理阻断结果）
- **国际化**：`src/renderer/i18n/locales/en.json`、`zh.json`（过期提示文案）
- **测试**：扩展管理器阻断逻辑、日期边界、未配置时不限制
