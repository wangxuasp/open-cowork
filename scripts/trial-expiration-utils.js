'use strict';

const EXPIRATION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FLEXIBLE_EXPIRATION_DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/**
 * @param {string} value
 * @returns {boolean}
 */
function isValidExpirationDate(value) {
  const trimmed = value.trim();
  if (!EXPIRATION_DATE_PATTERN.test(trimmed)) {
    return false;
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

/**
 * Normalize YYYY-M-D or YYYY-MM-DD into canonical YYYY-MM-DD.
 *
 * @param {string | undefined | null} value
 * @returns {string | null}
 */
function normalizeTrialExpiration(value) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  if (EXPIRATION_DATE_PATTERN.test(trimmed) && isValidExpirationDate(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(FLEXIBLE_EXPIRATION_DATE_PATTERN);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isValidExpirationDate(normalized) ? normalized : null;
}

/**
 * @typedef {{ valid: true; normalized?: string | null } | { valid: false; reason: string }} TrialExpirationValidation
 */

/**
 * @param {string | undefined} value
 * @returns {TrialExpirationValidation}
 */
function validateTrialExpiration(value) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return { valid: true, normalized: null };
  }

  const normalized = normalizeTrialExpiration(trimmed);
  if (!normalized) {
    return {
      valid: false,
      reason: `Invalid AGENT_TRIAL_EXPIRATION "${trimmed}" (expected YYYY-MM-DD)`,
    };
  }

  return { valid: true, normalized };
}

module.exports = {
  EXPIRATION_DATE_PATTERN,
  isValidExpirationDate,
  normalizeTrialExpiration,
  validateTrialExpiration,
};
