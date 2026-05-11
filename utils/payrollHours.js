/** Heures légales de référence Maroc : 44 h/semaine sur 52 semaines, lissées sur 12 mois. */
export const STANDARD_WEEKLY_HOURS = 44;
export const WEEKS_PER_YEAR = 52;

/** @param {number} [weekly=44] */
export function monthlyHoursFromWeekly(weekly = STANDARD_WEEKLY_HOURS) {
  const w = Number(weekly);
  if (!Number.isFinite(w) || w <= 0) {
    return Number(((STANDARD_WEEKLY_HOURS * WEEKS_PER_YEAR) / 12).toFixed(2));
  }
  return Number(((w * WEEKS_PER_YEAR) / 12).toFixed(2));
}
