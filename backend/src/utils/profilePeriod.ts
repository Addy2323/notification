export type ProfilePeriod = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'SEMI_ANNUAL';
export function profileDateRange(period: ProfilePeriod, now = new Date()) {
  if (period === 'ALL') return undefined;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'THIS_WEEK') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === 'THIS_MONTH') start.setDate(1);
  if (period === 'SEMI_ANNUAL') { start.setDate(1); start.setMonth(start.getMonth() < 6 ? 0 : 6); }
  return { gte: start, lte: now };
}
