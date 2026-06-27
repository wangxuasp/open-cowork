import type {
  AgentRuntimeExtension,
  BeforeSessionRunResult,
} from '../extensions/agent-runtime-extension';
import { buildTrialExpiredMessage, getTrialExpirationDate, isTrialExpired } from './trial-config';

export class TrialExpirationExtension implements AgentRuntimeExtension {
  readonly name = 'trial-expiration';

  async beforeSessionRun(): Promise<BeforeSessionRunResult | void> {
    const expirationDate = getTrialExpirationDate();
    if (!expirationDate || !isTrialExpired()) {
      return;
    }

    return {
      blocked: true,
      blockReason: buildTrialExpiredMessage(expirationDate),
    };
  }
}
