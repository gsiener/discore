/**
 * Render the body of the Game Summary panel: comparison rows for HOLDS,
 * BREAKS, BREAK CONVERSION (both teams), plus a Tech-only FORCED TURNS row.
 */

export interface SummaryStats {
  us: {
    holds: number;
    oPoints: number;
    breaks: number;
    dPoints: number;
    dirtyHolds: number; // holds where we turned it over but got it back
    forcedTurns: number; // breaks + failed conversions (logged)
  };
  them: {
    holds: number;
    oPoints: number;
    breaks: number;
    dPoints: number;
    dirtyHolds: number; // opp holds we forced a turnover on (= our failed break chances)
  };
  gameCount: number;
}

export function renderGameSummaryRows(container: HTMLElement, stats: SummaryStats): void {
  container.innerHTML = '';
  container.appendChild(rateRow('HOLDS', stats.us.holds, stats.us.oPoints, stats.them.holds, stats.them.oPoints));
  // Clean hold rate: (holds - dirty) / holds. Only shown for us because
  // detecting an opp dirty hold relies on logging opp's defensive plays,
  // which we don't track — biasing their clean-hold rate artificially high.
  container.appendChild(rateRow(
    'CLEAN HOLDS',
    stats.us.holds - stats.us.dirtyHolds, stats.us.holds,
    null, null,
  ));
  container.appendChild(rateRow('BREAKS', stats.us.breaks, stats.us.dPoints, stats.them.breaks, stats.them.dPoints));
  // Break conversion is Tech-only — we don't log opponents' forced turns.
  container.appendChild(rateRow('BREAK CONVERSION', stats.us.breaks, stats.us.forcedTurns, null, null));
  container.appendChild(singleRow('FORCED TURNS', stats.us.forcedTurns));
}

function rateRow(label: string, usNum: number, usDen: number, themNum: number | null, themDen: number | null): HTMLElement {
  const row = document.createElement('div');
  row.className = 'gs-row';
  row.appendChild(rateCell(usNum, usDen, 'us'));
  row.appendChild(labelCell(label));
  row.appendChild(rateCell(themNum, themDen, 'them'));
  return row;
}

function singleRow(label: string, value: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'gs-row gs-row-single';
  const v1 = document.createElement('div');
  v1.className = 'gs-cell gs-us gs-cell-single';
  v1.innerHTML = `<span class="gs-num">${value}</span>`;
  row.appendChild(v1);
  row.appendChild(labelCell(label));
  const v2 = document.createElement('div');
  v2.className = 'gs-cell gs-them';
  v2.innerHTML = `<span class="gs-num gs-num-dim">—</span>`;
  v2.title = 'We only log our own forced turnovers';
  row.appendChild(v2);
  return row;
}

function rateCell(num: number | null, den: number | null, side: 'us' | 'them'): HTMLElement {
  const cell = document.createElement('div');
  cell.className = `gs-cell gs-${side}`;
  if (num === null || den === null) {
    cell.innerHTML = `<span class="gs-num gs-num-dim">—</span>`;
    cell.title = "We don't log opponent defensive plays, so this isn't comparable";
    return cell;
  }
  const pct = den > 0 ? Math.round((num / den) * 100) : null;
  const pctText = pct !== null ? `${pct}%` : '—';
  // PCT outermost, then fraction nearer center
  if (side === 'us') {
    cell.innerHTML = `<span class="gs-pct">${pctText}</span><span class="gs-frac">${num}/${den}</span>`;
  } else {
    cell.innerHTML = `<span class="gs-frac">${num}/${den}</span><span class="gs-pct">${pctText}</span>`;
  }
  return cell;
}

function labelCell(label: string): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'gs-label';
  cell.textContent = label;
  return cell;
}
