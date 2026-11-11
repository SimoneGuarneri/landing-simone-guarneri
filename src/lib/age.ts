/**
 * Whole years between an ISO birth date (`YYYY-MM-DD`) and `now`, exact by calendar day
 * (local time): the age goes up on the birthday itself, not the day after.
 * Shared by the build (no-JS fallback) and the hero's browser script.
 */
export function ageOn(birthDate: string, now: Date = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) throw new Error(`Expected a birth date like "2002-01-21", got "${birthDate}"`);
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const month = now.getMonth() + 1;
  const beforeBirthday = month < m || (month === m && now.getDate() < d);
  return now.getFullYear() - y - (beforeBirthday ? 1 : 0);
}
