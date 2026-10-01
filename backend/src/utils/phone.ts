/**
 * Tanzania Phone System Normalizer & Flexible Validator
 * Standardizes 07XXXXXXXX, 06XXXXXXXX, 255XXXXXXXXX, +255XXXXXXXXX format.
 */
export function normalizePhone(input: string): string {
  if (!input) return '';

  // Remove spaces, dashes, parentheses
  let cleaned = input.trim().replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('07') || cleaned.startsWith('06')) {
    cleaned = '+255' + cleaned.slice(1);
  } else if (cleaned.startsWith('255') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  } else if ((cleaned.startsWith('7') || cleaned.startsWith('6')) && cleaned.length === 9) {
    cleaned = '+255' + cleaned;
  }

  return cleaned;
}

export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const normalized = normalizePhone(phone);
  return /^\+255[67]\d{8}$/.test(normalized);
}
