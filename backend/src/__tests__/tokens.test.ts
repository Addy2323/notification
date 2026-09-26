import { generateTrackingToken, generateDriverToken } from '../utils/token';

describe('High Entropy Security Tokens', () => {
  test('should generate unique tracking tokens with prefix trk_', () => {
    const t1 = generateTrackingToken();
    const t2 = generateTrackingToken();
    expect(t1.startsWith('trk_')).toBe(true);
    expect(t2.startsWith('trk_')).toBe(true);
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThan(40);
  });

  test('should generate unique driver tokens with prefix drv_', () => {
    const d1 = generateDriverToken();
    const d2 = generateDriverToken();
    expect(d1.startsWith('drv_')).toBe(true);
    expect(d2.startsWith('drv_')).toBe(true);
    expect(d1).not.toBe(d2);
    expect(d1.length).toBeGreaterThan(40);
  });
});
