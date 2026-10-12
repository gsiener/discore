/**
 * Seasons run Aug 1 – Jul 31 and are labeled by their two calendar years,
 * e.g. games from 2026-08-01 through 2027-07-31 belong to "2026-27".
 */

const SEASON_START_MONTH = 8; // August

/** Season label ("2026-27") for a YYYY-MM-DD game date. */
export function seasonForDate(date: string): string {
  const [year, month] = date.split('-').map(Number);
  const startYear = month >= SEASON_START_MONTH ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** Season label for today (or the given date). */
export function currentSeason(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return seasonForDate(`${y}-${m}-${d}`);
}

/** First and last date (YYYY-MM-DD) of a season label like "2026-27". */
export function seasonRange(season: string): { from: string; to: string } {
  const startYear = parseInt(season.slice(0, 4), 10);
  return { from: `${startYear}-08-01`, to: `${startYear + 1}-07-31` };
}

/** True if the date falls in the season. Undated games are excluded (match the server's game_date filter). */
export function isInSeason(date: string | undefined, season: string): boolean {
  if (!date) return false;
  return seasonForDate(date) === season;
}
