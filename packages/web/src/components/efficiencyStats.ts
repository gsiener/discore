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

  // Dirty holds: held the point, but only after turning it over and getting it back
  const dirtyCount = document.getElementById('o-line-dirty-count');
  const dirtyRecord = document.getElementById('o-line-dirty-record');
  if (dirtyCount && dirtyRecord) {
    dirtyCount.textContent = lineStats.oLineDirtyHolds.toString();
    dirtyRecord.textContent = `(${lineStats.oLineDirtyHolds} of ${lineStats.oLineHolds} ${pluralize('hold', lineStats.oLineHolds)})`;
  }

  // Update D-line stats
  const dLinePercentage = document.getElementById('d-line-percentage');
  const dLineRecord = document.getElementById('d-line-record');
  if (dLinePercentage && dLineRecord) {
    dLinePercentage.textContent = `${lineStats.dLineBreakPercentage}%`;
    dLineRecord.textContent = `(${lineStats.dLineBreaks}/${lineStats.dLinePoints})`;
  }

  // Missed break chances: forced a turnover on D but still gave up the point
  const failedCount = document.getElementById('d-line-failed-count');
  const failedRecord = document.getElementById('d-line-failed-record');
  if (failedCount && failedRecord) {
    failedCount.textContent = lineStats.dLineFailedConversions.toString();
    failedRecord.textContent = `(${lineStats.dLineFailedConversions} of ${lineStats.dLinePoints} D ${pluralize('point', lineStats.dLinePoints)})`;
  }
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}
