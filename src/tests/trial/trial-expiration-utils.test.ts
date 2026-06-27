import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  normalizeTrialExpiration,
  validateTrialExpiration,
} = require('../../../scripts/trial-expiration-utils.js');

describe('trial-expiration-utils', () => {
  it('normalizes flexible dates', () => {
    expect(normalizeTrialExpiration('2026-6-26')).toBe('2026-06-26');
    expect(normalizeTrialExpiration('2026-06-26')).toBe('2026-06-26');
  });

  it('rejects invalid dates', () => {
    expect(normalizeTrialExpiration('2026-13-01')).toBeNull();
    expect(validateTrialExpiration('2026-2-30').valid).toBe(false);
  });
});
