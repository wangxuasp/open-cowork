import { describe, expect, it, vi } from 'vitest';
import { switchToSession } from '../../renderer/utils/session-switch';
import type { Message, TraceStep } from '../../renderer/types';
import type { SessionState } from '../../renderer/store';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeMessage(sessionId: string): Message {
  return {
    id: `msg-${sessionId}`,
    sessionId,
    role: 'user',
    content: [{ type: 'text', text: 'history' }],
    timestamp: 1,
  };
}

describe('switchToSession', () => {
  it('hydrates uncached history before activating the session', async () => {
    const sessionId = 'session-1';
    const events: string[] = [];
    const sessionStates: Record<string, SessionState> = {};
    const messages = createDeferred<Message[]>();

    const switching = switchToSession({
      activeSessionId: null,
      sessionId,
      isElectron: true,
      getSessionStates: () => sessionStates,
      setShowSettings: (show) => events.push(`settings:${show}`),
      setActiveSession: (id) => events.push(`active:${id ?? 'none'}`),
      setMessages: (id, loadedMessages) => {
        events.push(`messages:${id}:${loadedMessages.length}`);
      },
      setTraceSteps: vi.fn(),
      getSessionMessages: () => messages.promise,
      getSessionTraceSteps: async () => [] as TraceStep[],
    });

    expect(events).toEqual(['settings:false']);

    messages.resolve([makeMessage(sessionId)]);
    await switching;

    expect(events).toEqual(['settings:false', 'messages:session-1:1', 'active:session-1']);
  });

  it('does not activate a stale selection after a newer click supersedes it', async () => {
    const sessionId = 'session-1';
    const events: string[] = [];
    const sessionStates: Record<string, SessionState> = {};
    const messages = createDeferred<Message[]>();
    let latest = true;

    const switching = switchToSession({
      activeSessionId: null,
      sessionId,
      isElectron: true,
      shouldActivate: () => latest,
      getSessionStates: () => sessionStates,
      setShowSettings: (show) => events.push(`settings:${show}`),
      setActiveSession: (id) => events.push(`active:${id ?? 'none'}`),
      setMessages: (id, loadedMessages) => {
        events.push(`messages:${id}:${loadedMessages.length}`);
      },
      setTraceSteps: vi.fn(),
      getSessionMessages: () => messages.promise,
      getSessionTraceSteps: async () => [] as TraceStep[],
    });

    latest = false;
    messages.resolve([makeMessage(sessionId)]);
    await switching;

    expect(events).toEqual(['settings:false', 'messages:session-1:1']);
  });
});
