/**
 * Tanzania Phone System Normalizer
 * Standardizes 07XXXXXXXX, 06XXXXXXXX, 255XXXXXXXXX, +255XXXXXXXXX to +255XXXXXXXXX format.
 */
export function normalizePhone(input: string): string {
  if (!input) return '';

  // Remove spaces, dashes, parentheses
  let cleaned = input.trim().replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('07') || cleaned.startsWith('06')) {
    cleaned = '+255' + cleaned.slice(1);
  } else if (cleaned.startsWith('255')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('7') || cleaned.startsWith('6')) {
    if (cleaned.length === 9) {
      cleaned = '+255' + cleaned;
    }
  }

  return cleaned;
}

export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Valid TZ phone is +255 followed by 9 digits starting with 6 or 7
  const tzRegex = /^\+255[67]\d{8}$/;
  return tzRegex.test(normalized);
}
