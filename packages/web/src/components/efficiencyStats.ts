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

  // Update D-line stats
  const dLinePercentage = document.getElementById('d-line-percentage');
  const dLineRecord = document.getElementById('d-line-record');
  if (dLinePercentage && dLineRecord) {
    dLinePercentage.textContent = `${lineStats.dLineBreakPercentage}%`;
    dLineRecord.textContent = `(${lineStats.dLineBreaks}/${lineStats.dLinePoints})`;
  }
}
