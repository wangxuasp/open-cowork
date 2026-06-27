## Context

Omni Worker 基于 Electron，Agent 会话通过 `SessionManager` → `ClaudeAgentRunner.run()` 启动。已有 `AgentRuntimeExtension` 钩子体系（`beforeSessionRun` / `afterSessionRun`），当前 `BeforeSessionRunResult` 仅支持注入 `promptPrefix` 与 `customTools`，无法阻断运行。

试用期限需在**构建时**确定并写入产物，避免用户通过修改本地配置绕过。项目使用 Vite 打包 main/renderer，已有 `scripts/pre-build-check.js` 在 `electron-builder` 前做资源校验。

## Goals / Non-Goals

**Goals:**

- 构建前通过环境变量 `AGENT_TRIAL_EXPIRATION=YYYY-MM-DD` 设定到期日，编译进应用
- 未设置变量时不启用限制（开发/正式版零影响）
- Agent 每次会话运行前检查本地日期；过期则阻断并展示中英文提示
- 到期日当天仍可使用；自次日 0:00（本地时区）起不可用
- 复用现有 `AgentRuntimeExtension` 机制，扩展 `BeforeSessionRunResult` 支持 `blocked`

**Non-Goals:**

- 在线授权、License 服务器、硬件绑定
- 用户在应用内修改或延长试用期
- 防篡改/反调试（仅做基础编译注入，非安全边界）
- 阻止应用启动或只读模式（仅阻止 Agent 会话运行）

## Decisions

### 1. 构建时注入：`import.meta.env` / Vite `define`

**选择：** 在 `vite.config.ts` 的 Electron main 构建配置中使用 `define` 将 `__AGENT_TRIAL_EXPIRATION__` 替换为 JSON 字符串（未设置则为 `""`）。

**理由：** 与现有 Vite 构建链一致，值在编译期固定，不依赖运行时 `.env` 文件（用户可修改）。

**备选：** `electron-builder` `extraMetadata` — 仅写入 `package.json`，main 进程读取需额外 IO，且不如 compile-time 常量简洁。

### 2. 运行时检查位置：`TrialExpirationExtension.beforeSessionRun`

**选择：** 新建 `TrialExpirationExtension` 实现 `AgentRuntimeExtension`，在 `src/main/index.ts` 注册到 `AgentRuntimeExtensionManager`（与 `MemoryExtension` 并列）。扩展读取编译常量，若已过期返回 `{ blocked: true, blockReason: '...' }`。

**理由：** 与会话启动钩子天然对齐；scheduled/remote 等路径最终都走 `agentRunner.run()` → `beforeSessionRun`。

**备选：** 在 `agent-runner.run()` 开头硬编码检查 — 可行但不如扩展模式可测试、可组合。

### 3. 阻断协议：扩展 `BeforeSessionRunResult`

**选择：**

```typescript
export interface BeforeSessionRunResult {
  promptPrefix?: string;
  customTools?: AgentRuntimeCustomTool[];
  blocked?: boolean;
  blockReason?: string;
}
```

`AgentRuntimeExtensionManager.beforeSessionRun` 遇到任一扩展返回 `blocked: true` 时**立即短路**，不再执行后续扩展。`ClaudeAgentRunner.run()` 在收到阻断结果后抛出带 `alreadyReportedToUser: true` 的错误（或专用 `TrialExpiredError`），消息使用 i18n key 对应的固定文案（main 进程用英文默认 + 中文常量，或通过 error code 让 renderer 翻译）。

**理由：** 统一扩展阻断能力；`SessionManager` 已有 `alreadyReportedToUser` 避免重复错误气泡。

**备选：** 仅 throw Error — 可行，但与扩展体系不一致。

### 4. 日期比较语义

**选择：** 将到期日解析为本地时区 `23:59:59.999` 的截止时间戳；`Date.now() > deadline` 视为过期。等价于「到期日当天全天可用」。

**备选：** UTC 午夜 — 对国内用户不直观。

### 5. 构建校验

**选择：** 在 `pre-build-check.js` 增加：若 `process.env.AGENT_TRIAL_EXPIRATION` 非空，则校验 `/^\d{4}-\d{2}-\d{2}$/` 且为合法日历日；非法则 fatal 退出。

**理由：** 尽早发现打包配置错误，避免发出无限制或错误日期的试用包。

### 6. 用户提示

**选择：** 抛出错误消息包含到期日（如「试用版已于 2026-06-30 到期，请联系管理员获取正式版。」）。在 i18n 中增加 `trial.expired` key；main 进程使用中文/英文双语文案（跟随现有 main 进程错误模式），或通过 error code 由 renderer 渲染。

**理由：** 用户需明确知道原因与到期日。

## Risks / Trade-offs

| 风险                         | 缓解                                             |
| ---------------------------- | ------------------------------------------------ |
| 用户修改系统时钟绕过         | 接受为试用场景的已知限制；非安全产品             |
| 用户反编译修改常量           | 同上；正式版不设置该变量                         |
| 开发环境误设变量导致无法测试 | 未设置变量 = 无限制；文档说明仅 release 构建使用 |
| 时区边界歧义                 | 文档明确使用本地日历日；单测覆盖边界             |

## Migration Plan

1. 合并代码后，正式版/开源构建**不设置** `AGENT_TRIAL_EXPIRATION`，行为不变
2. 试用版 CI/CD 增加 env：`AGENT_TRIAL_EXPIRATION=2026-12-31 npm run build:win`
3. 无需数据库迁移或用户数据变更

## Open Questions

- （无）错误文案是否需接入 renderer i18n 动态语言切换，还是 main 进程固定双语即可 — **暂定**：main 抛出含到期日的清晰中文/英文消息，后续可改为 error code + renderer i18n
