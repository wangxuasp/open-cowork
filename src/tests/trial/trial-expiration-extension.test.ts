import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../main/trial/trial-config', () => ({
  getTrialExpirationDate: vi.fn(),
  isTrialExpired: vi.fn(),
  buildTrialExpiredMessage: vi.fn((date: string) => `Expired on ${date}`),
}));

import { getTrialExpirationDate, isTrialExpired } from '../../main/trial/trial-config';
import { TrialExpirationExtension } from '../../main/trial/trial-expiration-extension';

describe('TrialExpirationExtension', () => {
  beforeEach(() => {
    vi.mocked(getTrialExpirationDate).mockReset();
    vi.mocked(isTrialExpired).mockReset();
  });

  it('does not block when no expiration is configured', async () => {
    vi.mocked(getTrialExpirationDate).mockReturnValue(null);

    const extension = new TrialExpirationExtension();
    await expect(extension.beforeSessionRun()).resolves.toBeUndefined();
  });

  it('does not block before expiration', async () => {
    vi.mocked(getTrialExpirationDate).mockReturnValue('2026-12-31');
    vi.mocked(isTrialExpired).mockReturnValue(false);

    const extension = new TrialExpirationExtension();
    await expect(extension.beforeSessionRun()).resolves.toBeUndefined();
  });

  it('blocks with a user-facing message when trial is expired', async () => {
    vi.mocked(getTrialExpirationDate).mockReturnValue('2026-01-01');
    vi.mocked(isTrialExpired).mockReturnValue(true);

    const extension = new TrialExpirationExtension();
    const result = await extension.beforeSessionRun();

    expect(result).toEqual({
      blocked: true,
      blockReason: 'Expired on 2026-01-01',
    });
  });
});
