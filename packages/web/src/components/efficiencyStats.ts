/**
 * Game Summary panel — side-by-side comparison of Us vs Them.
 * Rows: HOLDS, BREAKS, BREAK CONVERSION, FORCED TURNS (Tech only, centered).
 *
 * Opponent stats are derived by symmetry from our LineStats:
 *   - their holds         = our D-line points where they scored = dPoints - dBreaks
 *   - their O-line points = our D-line points
 *   - their breaks        = our O-line points where they scored = oPoints - oHolds
 *   - their D-line points = our O-line points
 */

import type { Game, LineStats } from '@scorebot/shared';
import { calculateLineStats } from '@scorebot/shared';
import { renderGameSummaryRows, type SummaryStats } from './gameSummaryRows.js';

export function renderEfficiencyStats(game: Game): void {
  const container = document.getElementById('efficiency-stats-container');
  if (!container) return;

  const lineStats = calculateLineStats(game);
  if (!lineStats || (lineStats.oLinePoints === 0 && lineStats.dLinePoints === 0)) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  setText('gs-team-us', game.teams.us.name);
  setText('gs-team-them', game.teams.them.name);
  setText('gs-score-us', String(game.score.us));
  setText('gs-score-them', String(game.score.them));

  const stats = toSummaryStats(lineStats, 1);
  const body = document.getElementById('gs-body');
  if (body) renderGameSummaryRows(body, stats);
}

function setText(id: string, value: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export function toSummaryStats(line: LineStats, gameCount: number): SummaryStats {
  const themHolds = line.dLinePoints - line.dLineBreaks;
  const themOPoints = line.dLinePoints;
  const themBreaks = line.oLinePoints - line.oLineHolds;
  const themDPoints = line.oLinePoints;
  const forcedTurns = line.dLineBreaks + line.dLineFailedConversions;
  return {
    us: {
      holds: line.oLineHolds,
      oPoints: line.oLinePoints,
      breaks: line.dLineBreaks,
      dPoints: line.dLinePoints,
      dirtyHolds: line.oLineDirtyHolds,
      forcedTurns,
    },
    them: {
      holds: themHolds,
      oPoints: themOPoints,
      breaks: themBreaks,
      dPoints: themDPoints,
    },
    gameCount,
  };
}
