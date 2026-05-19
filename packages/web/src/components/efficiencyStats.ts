/**
 * Efficiency stats rendering
 * Displays O-line hold percentage and D-line break percentage
 */

import type { Game } from '@scorebot/shared';
import { calculateLineStats } from '@scorebot/shared';

export function renderEfficiencyStats(game: Game): void {
  const container = document.getElementById('efficiency-stats-container');
  if (!container) return;

  const lineStats = calculateLineStats(game);

  // Hide if we can't calculate stats
  if (!lineStats || lineStats.oLinePoints === 0 && lineStats.dLinePoints === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  // Update O-line stats
  const oLinePercentage = document.getElementById('o-line-percentage');
  const oLineRecord = document.getElementById('o-line-record');
  if (oLinePercentage && oLineRecord) {
    oLinePercentage.textContent = `${lineStats.oLineHoldPercentage}%`;
    oLineRecord.textContent = `(${lineStats.oLineHolds}/${lineStats.oLinePoints})`;
  }

  // Clean hold %: holds without a turnover, out of all holds.
  // Inverse of "dirty hold rate" but framed positively to match Hold % / Break %.
  const cleanPct = document.getElementById('o-line-clean-percentage');
  const cleanRecord = document.getElementById('o-line-clean-record');
  if (cleanPct && cleanRecord) {
    const cleanHolds = lineStats.oLineHolds - lineStats.oLineDirtyHolds;
    cleanPct.textContent = lineStats.oLineHolds > 0
      ? `${Math.round((cleanHolds / lineStats.oLineHolds) * 100)}%`
      : '—';
    cleanRecord.textContent = `(${cleanHolds} of ${lineStats.oLineHolds} ${pluralize('hold', lineStats.oLineHolds)})`;
  }

  // Update D-line stats
  const dLinePercentage = document.getElementById('d-line-percentage');
  const dLineRecord = document.getElementById('d-line-record');
  if (dLinePercentage && dLineRecord) {
    dLinePercentage.textContent = `${lineStats.dLineBreakPercentage}%`;
    dLineRecord.textContent = `(${lineStats.dLineBreaks}/${lineStats.dLinePoints})`;
  }

  // Break conversion %: forced turns that we converted into breaks.
  // Denominator is logged forced turns (breaks + missed), not all D points,
  // because breaks without a logged D-play aren't conversions of a logged turn.
  const convPct = document.getElementById('d-line-conversion-percentage');
  const convRecord = document.getElementById('d-line-conversion-record');
  if (convPct && convRecord) {
    const forcedTurns = lineStats.dLineBreaks + lineStats.dLineFailedConversions;
    convPct.textContent = forcedTurns > 0
      ? `${Math.round((lineStats.dLineBreaks / forcedTurns) * 100)}%`
      : '—';
    convRecord.textContent = `(${lineStats.dLineBreaks} of ${forcedTurns} forced ${pluralize('turn', forcedTurns)})`;
  }
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}
