import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const agentRunnerPath = path.resolve(process.cwd(), 'src/main/claude/agent-runner.ts');
const agentRunnerContent = readFileSync(agentRunnerPath, 'utf8');

describe('ClaudeAgentRunner Open Cowork SDK integration', () => {
  it('avoids dynamic re-import shadowing for config store singletons', () => {
    expect(agentRunnerContent).toContain(
      "import { mcpConfigStore } from '../mcp/mcp-config-store'"
    );
    expect(agentRunnerContent).not.toContain(
      "const { configStore } = await import('../config/config-store')"
    );
    expect(agentRunnerContent).not.toContain(
      "const { mcpConfigStore } = await import('../mcp/mcp-config-store')"
    );
  });

  it('keeps MCP config build resilient', () => {
    expect(agentRunnerContent).toContain('function safeStringify');
    expect(agentRunnerContent).toContain('Failed to prepare MCP server config, skipping server');
  });

  it('uses standard markdown link guidance for sources citations', () => {
    expect(agentRunnerContent).toContain(
      'otherwise use standard Markdown links: [Title](https://claude.ai/chat/URL)'
    );
  });

  it('avoids duplicating the current user prompt in contextual history assembly', () => {
    expect(agentRunnerContent).toContain('const conversationMessages = existingMessages');
    // Image-containing messages are filtered out individually (not skipping entire history)
    expect(agentRunnerContent).toContain('const textOnlyMessages = conversationMessages');
    expect(agentRunnerContent).toContain('textOnlyMessages.slice(0, -1)');
    expect(agentRunnerContent).toContain(
      "textOnlyMessages[textOnlyMessages.length - 1]?.role === 'user'"
    );
  });

  it('keeps MCP server logging compact unless full debug logging is enabled', () => {
    expect(agentRunnerContent).toContain("log('[ClaudeAgentRunner] Final mcpServers summary:'");
    expect(agentRunnerContent).toContain("if (process.env.COWORK_LOG_SDK_MESSAGES_FULL === '1') {");
    expect(agentRunnerContent).toContain("log('[ClaudeAgentRunner] Final mcpServers config:'");
  });

  it('summarizes noisy SDK message updates instead of logging every text delta', () => {
    expect(agentRunnerContent).toContain('const streamEventCounts = new Map<string, number>();');
    expect(agentRunnerContent).toContain(
      "if (updateType !== 'text_delta' && updateType !== 'thinking_delta') {"
    );
    expect(agentRunnerContent).toContain("'[ClaudeAgentRunner] Event: message_end'");
    expect(agentRunnerContent).toContain('messageUpdateCounts: getStreamEventSummary()');
    expect(agentRunnerContent).toContain("if (process.env.COWORK_LOG_SDK_MESSAGES_FULL === '1') {");
    expect(agentRunnerContent).toContain("'[ClaudeAgentRunner] message_end raw message:'");
  });

  it('reuses the shared user-facing error helper', () => {
    expect(agentRunnerContent).toContain(
      "import { resolveMessageEndPayload, toUserFacingErrorText } from './agent-runner-message-end'"
    );
    expect(agentRunnerContent).toContain(
      'const errorText = toUserFacingErrorText(toErrorText(error));'
    );
  });

  it('uses pi DefaultResourceLoader with additionalSkillPaths and appendSystemPrompt', () => {
    expect(agentRunnerContent).toContain('additionalSkillPaths: skillPaths');
    expect(agentRunnerContent).toContain('appendSystemPrompt: coworkAppendPrompt');
    expect(agentRunnerContent).not.toContain('systemPromptOverride');
  });

  it('applies Teamcenter BASE_URL substitution before loading runtime skills', () => {
    expect(agentRunnerContent).toContain(
      "import {\n  applyTeamcenterBaseUrlToSkillDescriptions,\n  TEAMCENTER_SKILL_TEMPLATE_FILENAME,\n} from '../skills/teamcenter-skill-runtime'"
    );
    expect(agentRunnerContent).toContain('applyTeamcenterBaseUrlToSkillDescriptions(');
    expect(agentRunnerContent).toContain('teamcenterRichClientMicroserviceUrl');
    expect(agentRunnerContent).toContain('teamcenterWebTierUrl');
    expect(agentRunnerContent).toContain('knowledgeBaseHttpUrl');
    expect(agentRunnerContent).toContain(
      'richClientMicroserviceUrl: teamcenterRichClientMicroserviceUrl'
    );
    expect(agentRunnerContent).toContain('webTierUrl: teamcenterWebTierUrl');
    expect(agentRunnerContent).toContain('knowledgeBaseHttpUrl,');
    expect(agentRunnerContent).toContain(
      'const skillPaths = await this.resolveSkillPaths(session.id, appSkillsDir);'
    );
    expect(agentRunnerContent).toContain(
      'const runtimeSkillsContentSignature = this.computeRuntimeSkillsContentSignature(appSkillsDir);'
    );
    expect(agentRunnerContent).toContain('const skillsSignature = JSON.stringify({');
    expect(agentRunnerContent).toContain('skillPaths,');
    expect(agentRunnerContent).toContain('runtimeSkillsContentSignature,');
    expect(agentRunnerContent).toContain('teamcenterRichClientMicroserviceUrl,');
    expect(agentRunnerContent).toContain('teamcenterWebTierUrl,');
    expect(agentRunnerContent).toContain('knowledgeBaseHttpUrl,');
  });

  it('refreshes materialized runtime skills before Teamcenter URL substitution', () => {
    expect(agentRunnerContent).toContain('private shouldRefreshRuntimeSkill');
    expect(agentRunnerContent).toContain('TEAMCENTER_SKILL_TEMPLATE_FILENAME');
    expect(agentRunnerContent).toContain('this.syncBuiltinSkillsToRuntimeDir(appSkillsDir);');
    expect(agentRunnerContent).toContain('this.syncUserSkillsToAppDir(appSkillsDir);');
    expect(agentRunnerContent).toContain('this.syncConfiguredSkillsToRuntimeDir(appSkillsDir);');
    expect(agentRunnerContent).toContain(
      'const teamcenterSkillUpdate = applyTeamcenterBaseUrlToSkillDescriptions'
    );
  });

  it('loads replaced runtime skills instead of unreplaced source skill paths', () => {
    expect(agentRunnerContent).toContain(
      'private async resolveSkillPaths(sessionId?: string, runtimeSkillsDir?: string)'
    );
    expect(agentRunnerContent).toContain('const basePaths = runtimeSkillsDir');
    expect(agentRunnerContent).toContain('? [runtimeSkillsDir]');
    expect(agentRunnerContent).toContain('private computeRuntimeSkillsContentSignature');
  });

  it('cleans failed Windows symlink remnants before copying runtime skills', () => {
    expect(agentRunnerContent).toContain('private removePathEntryIfPresent(targetPath: string)');
    expect(agentRunnerContent).toContain('this.removePathEntryIfPresent(runtimeSkillPath);');
    expect(agentRunnerContent).toContain('this.removePathEntryIfPresent(targetPath);');
    expect(agentRunnerContent).toContain('lstatSync(targetPath)');
    expect(agentRunnerContent).toContain('fs.unlinkSync(targetPath)');
  });

  it('recreates cached pi sessions when the runtime signature changes', () => {
    expect(agentRunnerContent).toContain(
      "import { buildPiSessionRuntimeSignature } from './pi-session-runtime'"
    );
    expect(agentRunnerContent).toContain(
      'const sessionRuntimeSignature = buildPiSessionRuntimeSignature({'
    );
    expect(agentRunnerContent).toContain(
      'cachedSession.runtimeSignature !== sessionRuntimeSignature'
    );
    expect(agentRunnerContent).toContain('Runtime changed, recreating cached pi session:');
    expect(agentRunnerContent).toContain('runtimeSignature: sessionRuntimeSignature');
  });

  it('uses the normalized route protocol so openrouter follows the openai-compatible path', () => {
    expect(agentRunnerContent).toContain('resolvePiRouteProtocol');
    expect(agentRunnerContent).toContain('const configProtocol = resolvePiRouteProtocol(');
    expect(agentRunnerContent).toContain('resolveSyntheticPiModelFallback');
  });

  it('nudges the model to proceed with reasonable assumptions', () => {
    expect(agentRunnerContent).toContain('proceed immediately with reasonable assumptions');
    expect(agentRunnerContent).toContain('within two days');
    expect(agentRunnerContent).toContain('most recent two relevant publication days');
  });

  it('routes MCP image results through structured helpers instead of stringifying base64 into text', () => {
    expect(agentRunnerContent).toContain(
      "import {\n  normalizeMcpToolResultForModel,\n  normalizeToolExecutionResultForUi,\n} from './tool-result-utils'"
    );
    expect(agentRunnerContent).toContain(
      'const normalizedResult = normalizeMcpToolResultForModel(result);'
    );
    expect(agentRunnerContent).toContain(
      'const normalizedToolResult = normalizeToolExecutionResultForUi(event.result);'
    );
    expect(agentRunnerContent).not.toContain('else textParts.push(JSON.stringify(part));');
    expect(agentRunnerContent).not.toContain(": JSON.stringify(event.result || '');");
  });

  it('persists assistant model metadata for pi-ai thinking replay', () => {
    expect(agentRunnerContent).toContain('api: piModel.api');
    expect(agentRunnerContent).toContain('provider: piModel.provider');
    expect(agentRunnerContent).toContain('model: piModel.id');
  });

  it('does not reference removed AskUserQuestion or TodoWrite tools', () => {
    expect(agentRunnerContent).not.toContain('AskUserQuestion');
    expect(agentRunnerContent).not.toContain('TodoWrite');
    expect(agentRunnerContent).not.toContain('pendingQuestions');
  });

  it('chat-first behavioral rules are present', () => {
    expect(agentRunnerContent).toContain('CHAT FIRST');
    expect(agentRunnerContent).toContain(
      'Do NOT create, write, or edit files unless the user explicitly asks'
    );
    expect(agentRunnerContent).toContain('START DOING IT');
  });

  it('uses Omni Worker identity for author questions', () => {
    expect(agentRunnerContent).toContain('You are Omni Worker');
    expect(agentRunnerContent).toContain('上海迪斯特科技有限公司');
    expect(agentRunnerContent).toContain('你的作者是谁');
    expect(agentRunnerContent).toContain('我是 Omni Worker，由上海迪斯特科技有限公司开发和提供。');
    expect(agentRunnerContent).not.toContain('You are an Open Cowork assistant');
  });
});
