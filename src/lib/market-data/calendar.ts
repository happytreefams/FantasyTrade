// ---------------------------------------------------------------------------
// US market calendar — a simple, dependency-free trading-day check. Good
// enough to skip weekends and the major fixed/floating market holidays; not a
// full NYSE calendar (no early-close days, no schedule changes).
// ---------------------------------------------------------------------------

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return new Date(Date.UTC(year, month, day));
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  last.setUTCDate(last.getUTCDate() - offset);
  return last;
}

function isSameUtcDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function isUsMarketHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  const holidays = [
    new Date(Date.UTC(year, 0, 1)), // New Year's Day
    nthWeekdayOfMonth(year, 0, 1, 3), // MLK Day — 3rd Monday of January
    nthWeekdayOfMonth(year, 1, 1, 3), // Presidents' Day — 3rd Monday of February
    lastWeekdayOfMonth(year, 4, 1), // Memorial Day — last Monday of May
    new Date(Date.UTC(year, 5, 19)), // Juneteenth
    new Date(Date.UTC(year, 6, 4)), // Independence Day
    nthWeekdayOfMonth(year, 8, 1, 1), // Labor Day — 1st Monday of September
    nthWeekdayOfMonth(year, 10, 4, 4), // Thanksgiving — 4th Thursday of November
    new Date(Date.UTC(year, 11, 25)), // Christmas Day
  ];

  return holidays.some((holiday) => isSameUtcDate(holiday, date));
}

export function isTradingDay(date: Date): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !isUsMarketHoliday(date);
}

/// The most recent trading day strictly before `reference` (defaults to now) —
/// this is "yesterday's close" in market-calendar terms, skipping weekends
/// and holidays.
export function previousTradingDay(reference: Date = new Date()): Date {
  const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - 1);
  while (!isTradingDay(date)) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date;
}
