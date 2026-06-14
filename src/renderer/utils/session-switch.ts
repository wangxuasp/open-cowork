import type { Message, TraceStep } from '../types';
import type { SessionState } from '../store';

type SessionStates = Record<string, SessionState>;

type SwitchToSessionOptions = {
  activeSessionId: string | null;
  sessionId: string;
  isElectron: boolean;
  shouldActivate?: () => boolean;
  getSessionStates: () => SessionStates;
  setShowSettings: (show: boolean) => void;
  setActiveSession: (sessionId: string | null) => void;
  setMessages: (sessionId: string, messages: Message[]) => void;
  setTraceSteps: (sessionId: string, steps: TraceStep[]) => void;
  getSessionMessages: (sessionId: string) => Promise<Message[]>;
  getSessionTraceSteps: (sessionId: string) => Promise<TraceStep[]>;
  onError?: (scope: 'messages' | 'traceSteps', error: unknown) => void;
};

export async function switchToSession({
  activeSessionId,
  sessionId,
  isElectron,
  shouldActivate,
  getSessionStates,
  setShowSettings,
  setActiveSession,
  setMessages,
  setTraceSteps,
  getSessionMessages,
  getSessionTraceSteps,
  onError,
}: SwitchToSessionOptions): Promise<void> {
  setShowSettings(false);

  if (activeSessionId === sessionId) return;

  const canActivate = () => shouldActivate?.() ?? true;

  const existingMessages = getSessionStates()[sessionId]?.messages;
  if ((!existingMessages || existingMessages.length === 0) && isElectron) {
    try {
      const messages = await getSessionMessages(sessionId);
      if (messages && messages.length > 0) {
        const latestMessages = getSessionStates()[sessionId]?.messages;
        if (!latestMessages || latestMessages.length === 0) {
          setMessages(sessionId, messages);
        }
      }
    } catch (error) {
      onError?.('messages', error);
    }
  }

  if (!canActivate()) return;

  setActiveSession(sessionId);

  const existingSteps = getSessionStates()[sessionId]?.traceSteps;
  if ((!existingSteps || existingSteps.length === 0) && isElectron) {
    try {
      const steps = await getSessionTraceSteps(sessionId);
      const latestSteps = getSessionStates()[sessionId]?.traceSteps;
      if (!latestSteps || latestSteps.length === 0) {
        setTraceSteps(sessionId, steps || []);
      }
    } catch (error) {
      onError?.('traceSteps', error);
    }
  }
}
