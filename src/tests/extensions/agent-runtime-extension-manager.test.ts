import { describe, it, expect } from 'vitest';
import { AgentRuntimeExtensionManager } from '../../main/extensions/agent-runtime-extension-manager';
import type { BeforeSessionRunContext } from '../../main/extensions/agent-runtime-extension';

const baseContext: BeforeSessionRunContext = {
  session: {
    id: 'session-1',
    title: 'Test',
    status: 'idle',
    cwd: '/tmp',
    model: 'test-model',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    memoryEnabled: false,
    mountedPaths: [],
    allowedTools: [],
  },
  prompt: 'hello',
  existingMessages: [],
  isColdStart: true,
};

describe('AgentRuntimeExtensionManager.beforeSessionRun blocking', () => {
  it('short-circuits when an extension returns blocked', async () => {
    let secondExtensionCalled = false;
    const manager = new AgentRuntimeExtensionManager([
      {
        name: 'blocker',
        beforeSessionRun: async () => ({
          blocked: true,
          blockReason: 'Trial expired',
        }),
      },
      {
        name: 'second',
        beforeSessionRun: async () => {
          secondExtensionCalled = true;
          return { promptPrefix: 'should-not-run' };
        },
      },
    ]);

    const result = await manager.beforeSessionRun(baseContext);

    expect(result).toEqual({
      blocked: true,
      blockReason: 'Trial expired',
    });
    expect(secondExtensionCalled).toBe(false);
  });

  it('merges prompt prefixes when not blocked', async () => {
    const manager = new AgentRuntimeExtensionManager([
      {
        name: 'first',
        beforeSessionRun: async () => ({ promptPrefix: 'prefix-a' }),
      },
      {
        name: 'second',
        beforeSessionRun: async () => ({ promptPrefix: 'prefix-b' }),
      },
    ]);

    const result = await manager.beforeSessionRun(baseContext);

    expect(result.blocked).toBeUndefined();
    expect(result.promptPrefix).toBe('prefix-a\n\nprefix-b');
  });
});
