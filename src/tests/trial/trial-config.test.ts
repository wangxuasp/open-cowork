import { describe, it, expect } from 'vitest';
import {
  buildTrialExpiredMessage,
  formatLocalDate,
  getTrialExpirationDate,
  isTrialExpired,
  isValidExpirationDate,
} from '../../main/trial/trial-config';

describe('trial-config', () => {
  it('returns null when no expiration is compiled', () => {
    expect(getTrialExpirationDate('')).toBeNull();
    expect(getTrialExpirationDate('   ')).toBeNull();
    expect(isTrialExpired(new Date('2026-07-01'), '')).toBe(false);
  });

  it('treats expiration day as still valid', () => {
    const expirationDay = new Date(2026, 5, 30, 23, 59, 59);
    expect(isTrialExpired(expirationDay, '2026-06-30')).toBe(false);
    expect(formatLocalDate(expirationDay)).toBe('2026-06-30');
  });

  it('blocks the day after expiration', () => {
    const dayAfter = new Date(2026, 6, 1, 0, 0, 0);
    expect(isTrialExpired(dayAfter, '2026-06-30')).toBe(true);
  });

  it('rejects invalid compiled values', () => {
    expect(getTrialExpirationDate('2026-13-40')).toBeNull();
    expect(getTrialExpirationDate('2026-2-30')).toBeNull();
    expect(isValidExpirationDate('2026-02-30')).toBe(false);
    expect(isValidExpirationDate('not-a-date')).toBe(false);
  });

  it('normalizes flexible compiled values', () => {
    expect(getTrialExpirationDate('2026-6-26')).toBe('2026-06-26');
  });

  it('builds a bilingual expired message', () => {
    const message = buildTrialExpiredMessage('2026-06-30');
    expect(message).toContain('2026-06-30');
    expect(message).toContain('Trial version expired');
    expect(message).toContain('试用版已于');
  });
});
