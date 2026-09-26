import crypto from 'crypto';

export function generateSecureToken(prefix: string = ''): string {
  const bytes = crypto.randomBytes(24).toString('hex');
  return prefix ? `${prefix}_${bytes}` : bytes;
}

export function generateTrackingToken(): string {
  return generateSecureToken('trk');
}

export function generateDriverToken(): string {
  return generateSecureToken('drv');
}
