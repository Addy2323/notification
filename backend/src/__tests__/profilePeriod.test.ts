import { profileDateRange } from '../utils/profilePeriod';

describe('merchant profile periods', () => {
  const now = new Date(2026, 9, 23, 15, 30);
  it('does not restrict all-time records', () => expect(profileDateRange('ALL', now)).toBeUndefined());
  it('starts today at midnight and ends at the current time', () => {
    expect(profileDateRange('TODAY', now)).toEqual({ gte: new Date(2026, 9, 23), lte: now });
  });
  it('starts the week on Monday, including when today is Sunday', () => {
    expect(profileDateRange('THIS_WEEK', now)!.gte).toEqual(new Date(2026, 9, 19));
    expect(profileDateRange('THIS_WEEK', new Date(2026, 9, 25))!.gte).toEqual(new Date(2026, 9, 19));
  });
  it('starts the month on the first without changing the supplied time', () => {
    expect(profileDateRange('THIS_MONTH', now)!.gte).toEqual(new Date(2026, 9, 1));
    expect(now.getDate()).toBe(23);
  });
  it('uses the correct calendar half-year at boundaries', () => {
    expect(profileDateRange('SEMI_ANNUAL', new Date(2026, 5, 30))!.gte).toEqual(new Date(2026, 0, 1));
    expect(profileDateRange('SEMI_ANNUAL', new Date(2026, 6, 1))!.gte).toEqual(new Date(2026, 6, 1));
    expect(profileDateRange('SEMI_ANNUAL', now)!.gte).toEqual(new Date(2026, 6, 1));
  });
});
