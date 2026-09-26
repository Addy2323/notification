import { normalizePhone, isValidPhone } from '../utils/phone';

describe('Tanzania Phone Normalizer & Validator', () => {
  test('should normalize 07XXXXXXXX to +2557XXXXXXXX', () => {
    expect(normalizePhone('0712345678')).toBe('+255712345678');
    expect(normalizePhone('0655112233')).toBe('+255655112233');
  });

  test('should keep valid +255XXXXXXXXX format', () => {
    expect(normalizePhone('+255712345678')).toBe('+255712345678');
  });

  test('should normalize 255XXXXXXXXX without leading plus', () => {
    expect(normalizePhone('255712345678')).toBe('+255712345678');
  });

  test('should validate correct Tanzanian numbers', () => {
    expect(isValidPhone('0712345678')).toBe(true);
    expect(isValidPhone('+255712345678')).toBe(true);
    expect(isValidPhone('0655112233')).toBe(true);
  });

  test('should invalidate improper numbers', () => {
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('0812345678')).toBe(false); // Invalid prefix 08
    expect(isValidPhone('abc')).toBe(false);
  });
});
