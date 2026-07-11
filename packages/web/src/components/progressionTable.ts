/**
 * Score progression table rendering
 * Displays point-by-point score evolution with break/hold indicators
 */

import type { Game } from '@scorebot/shared';
import { EventType, buildPointLedger } from '@scorebot/shared';

export function renderProgressionTable(game: Game): void {
  const table = document.getElementById('progression-table');
  if (!table) return;

  // Get all goal events to build progression
  const goalEvents = game.events.filter(e => e.type === EventType.GOAL);

  if (goalEvents.length === 0) {
    const container = document.getElementById('progression-table-container');
    if (container) container.classList.add('hidden');
    return;
  }

  const container = document.getElementById('progression-table-container');
  if (container) container.classList.remove('hidden');

  // Point ledger indexes 1:1 with goalEvents; break/hold and the halftime
  // separator both come from it.
  const points = buildPointLedger(game).points;
  const firstAfterHalftimeIndex = points.findIndex(p => p.firstAfterHalftime);
  const halftimePointIndex = firstAfterHalftimeIndex > 0 ? firstAfterHalftimeIndex - 1 : -1;

  const isBreak = (index: number): boolean => {
    return points[index]?.result === 'break';
  };

  // Build header row with point numbers
  const thead = table.querySelector('thead tr');
  if (thead) {
    thead.innerHTML = '<th class="team-col">Team</th>';
    goalEvents.forEach((_, index) => {
      const th = document.createElement('th');
      th.textContent = (index + 1).toString();
      th.className = 'point-col';

      // Add separator classes
      if (index === 0) {
        th.classList.add('first-point');
      }
      if (index === halftimePointIndex) {
        th.classList.add('before-halftime');
      }

      thead.appendChild(th);
    });
    const finalTh = document.createElement('th');
    finalTh.textContent = 'Final';
    finalTh.className = 'point-col final-col';
    thead.appendChild(finalTh);
  }

  // Build body rows for each team
  const tbody = table.querySelector('tbody');
  if (tbody) {
    tbody.innerHTML = '';

    // Our team row
    const usRow = document.createElement('tr');
    usRow.className = 'team-row';
    const usTeamCell = document.createElement('td');
    usTeamCell.className = 'team-col';
    usTeamCell.textContent = game.teams.us.name;
    usRow.appendChild(usTeamCell);

    goalEvents.forEach((event, index) => {
      const td = document.createElement('td');
      td.className = 'point-col';
      td.textContent = event.score.us.toString();

      // Add separator classes
      if (index === 0) {
        td.classList.add('first-point');
      }
      if (index === halftimePointIndex) {
        td.classList.add('before-halftime');
      }

      // Highlight when this team scored
      if (event.team === 'us') {
        td.classList.add('scoring-point');
        // Add break underline
        if (isBreak(index)) {
          td.classList.add('break-point');
        }
      }

      usRow.appendChild(td);
    });

    const usFinalCell = document.createElement('td');
    usFinalCell.className = 'point-col final-col';
    usFinalCell.textContent = game.score.us.toString();
    usRow.appendChild(usFinalCell);
    tbody.appendChild(usRow);

    // Their team row
    const themRow = document.createElement('tr');
    themRow.className = 'team-row';
    const themTeamCell = document.createElement('td');
    themTeamCell.className = 'team-col';
    themTeamCell.textContent = game.teams.them.name;
    themRow.appendChild(themTeamCell);

    goalEvents.forEach((event, index) => {
      const td = document.createElement('td');
      td.className = 'point-col';
      td.textContent = event.score.them.toString();

      // Add separator classes
      if (index === 0) {
        td.classList.add('first-point');
      }
      if (index === halftimePointIndex) {
        td.classList.add('before-halftime');
      }

      // Highlight when this team scored
      if (event.team === 'them') {
        td.classList.add('scoring-point');
        // Add break underline
        if (isBreak(index)) {
          td.classList.add('break-point');
        }
      }

      themRow.appendChild(td);
    });

    const themFinalCell = document.createElement('td');
    themFinalCell.className = 'point-col final-col';
    themFinalCell.textContent = game.score.them.toString();
    themRow.appendChild(themFinalCell);
    tbody.appendChild(themRow);
  }
}
