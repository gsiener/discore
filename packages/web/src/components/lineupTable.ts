/**
 * Lineup table rendering
 * Displays per-point player lineups as a grid with check marks
 */

import type { Game } from '@scorebot/shared';
import { EventType, TeamSide } from '@scorebot/shared';

export function renderLineupTable(game: Game): void {
  const container = document.getElementById('lineup-table-container');
  if (!container) return;

  if (!game.lineups || game.lineups.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const goalEvents = game.events.filter(e => e.type === EventType.GOAL);

  // Build set of all players, preserving lineup order
  const playerOrder: string[] = [];
  const playerSet = new Set<string>();
  for (const lineup of game.lineups) {
    for (const player of lineup.players) {
      if (!playerSet.has(player)) {
        playerSet.add(player);
        playerOrder.push(player);
      }
    }
  }

  // Build lookup: player -> set of point numbers they played
  const playerPoints = new Map<string, Set<number>>();
  for (const lineup of game.lineups) {
    for (const player of lineup.players) {
      if (!playerPoints.has(player)) {
        playerPoints.set(player, new Set());
      }
      playerPoints.get(player)!.add(lineup.pointNumber);
    }
  }

  // Count points played per player for sorting
  const pointsPlayed = (player: string) => playerPoints.get(player)?.size ?? 0;
  playerOrder.sort((a, b) => pointsPlayed(b) - pointsPlayed(a));

  // Find halftime point index
  const halftimeEvent = game.events.find(e => e.type === EventType.HALFTIME);
  let halftimePointIndex = -1;
  if (halftimeEvent) {
    for (let i = 0; i < goalEvents.length; i++) {
      if (goalEvents[i].timestamp < halftimeEvent.timestamp) {
        halftimePointIndex = i;
      } else {
        break;
      }
    }
  }

  const totalPoints = game.lineups.length;

  const table = document.getElementById('lineup-table') as HTMLTableElement;
  if (!table) return;

  // Header row with point numbers
  const thead = table.querySelector('thead tr');
  if (thead) {
    thead.innerHTML = '<th class="lineup-player-col">Player</th>';
    for (let i = 0; i < totalPoints; i++) {
      const th = document.createElement('th');
      th.textContent = (i + 1).toString();
      th.className = 'lineup-point-col';
      if (i === 0) th.classList.add('first-point');
      if (i === halftimePointIndex) th.classList.add('before-halftime');

      // Color by who scored
      const goalEvent = goalEvents[i];
      if (goalEvent) {
        th.classList.add(goalEvent.team === TeamSide.US ? 'point-us' : 'point-them');
      }

      thead.appendChild(th);
    }
    const totalTh = document.createElement('th');
    totalTh.textContent = 'Pts';
    totalTh.className = 'lineup-point-col lineup-total-col';
    thead.appendChild(totalTh);
  }

  // Player rows
  const tbody = table.querySelector('tbody');
  if (tbody) {
    tbody.innerHTML = '';

    for (const player of playerOrder) {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.className = 'lineup-player-col';
      nameCell.textContent = player;
      row.appendChild(nameCell);

      const points = playerPoints.get(player)!;

      for (let i = 0; i < totalPoints; i++) {
        const td = document.createElement('td');
        td.className = 'lineup-point-col';
        if (i === 0) td.classList.add('first-point');
        if (i === halftimePointIndex) td.classList.add('before-halftime');

        if (points.has(i + 1)) {
          td.textContent = 'x';
          td.classList.add('lineup-played');

          const goalEvent = goalEvents[i];
          if (goalEvent) {
            td.classList.add(goalEvent.team === TeamSide.US ? 'point-us' : 'point-them');
          }
        }

        row.appendChild(td);
      }

      const totalCell = document.createElement('td');
      totalCell.className = 'lineup-point-col lineup-total-col';
      totalCell.textContent = points.size.toString();
      row.appendChild(totalCell);

      tbody.appendChild(row);
    }
  }
}
