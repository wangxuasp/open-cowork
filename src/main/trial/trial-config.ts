const BUILT_IN_EXPIRATION: string =
  typeof __AGENT_TRIAL_EXPIRATION__ !== 'undefined' ? __AGENT_TRIAL_EXPIRATION__ : '';

const EXPIRATION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FLEXIBLE_EXPIRATION_DATE_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

export function isValidExpirationDate(value: string): boolean {
  const trimmed = value.trim();
  if (!EXPIRATION_DATE_PATTERN.test(trimmed)) {
    return false;
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
  );
}

export function normalizeExpirationDate(value: string): string | null {
  const trimmed = value.trim();
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

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTrialExpirationDate(compiledValue: string = BUILT_IN_EXPIRATION): string | null {
  return normalizeExpirationDate(compiledValue);
}

export function isTrialExpired(
  now: Date = new Date(),
  compiledValue: string = BUILT_IN_EXPIRATION
): boolean {
  const expirationDate = getTrialExpirationDate(compiledValue);
  if (!expirationDate) {
    return false;
  }
  return formatLocalDate(now) > expirationDate;
}

export function buildTrialExpiredMessage(expirationDate: string): string {
  return `Trial version expired on ${expirationDate}. Please contact your administrator for a full license.\n试用版已于 ${expirationDate} 到期，请联系管理员获取正式版。`;
}
