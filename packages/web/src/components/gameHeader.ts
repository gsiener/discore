/**
 * Game header rendering
 * Handles score display, team names, status badge, game metadata, and winner arrows
 */

import type { Game } from '@scorebot/shared';
import { GameStatus, EventType } from '@scorebot/shared';

export function renderGameHeader(game: Game): void {
  renderGameMeta(game);
  renderTeamNames(game);
  renderScores(game);
  renderStatus(game);
}

function renderGameMeta(game: Game): void {
  const dateEl = document.getElementById('game-date');
  const fieldEl = document.getElementById('game-field');

  if (dateEl) {
    // Format: "Fri Nov 21 - 11:00 AM"
    const gameStart = game.events.find(e => e.type === EventType.GAME_START);
    if (gameStart) {
      const date = new Date(gameStart.timestamp);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      dateEl.textContent = `${dayName} ${monthDay} - ${time}`;
    }
  }

  if (fieldEl) {
    // For now, we don't have field info in the game object
    // fieldEl.textContent = 'Field 4';
  }
}

function renderTeamNames(game: Game): void {
  const teamUs = document.getElementById('team-us');
  const teamThem = document.getElementById('team-them');
  if (teamUs) teamUs.textContent = game.teams.us.name;
  if (teamThem) teamThem.textContent = game.teams.them.name;
}

function renderScores(game: Game): void {
  const scoreUs = document.getElementById('score-us');
  const scoreThem = document.getElementById('score-them');

  if (scoreUs && scoreThem) {
    const isFinished = game.status === GameStatus.FINISHED;
    const weWon = game.score.us > game.score.them;
    const theyWon = game.score.them > game.score.us;

    // Add winner arrow if game is finished
    if (isFinished && weWon) {
      scoreUs.innerHTML = `\u25C0 ${game.score.us}`;
      scoreThem.textContent = game.score.them.toString();
    } else if (isFinished && theyWon) {
      scoreUs.textContent = game.score.us.toString();
      scoreThem.innerHTML = `${game.score.them} \u25B6`;
    } else {
      scoreUs.textContent = game.score.us.toString();
      scoreThem.textContent = game.score.them.toString();
    }
  }
}

function renderStatus(game: Game): void {
  const statusBadge = document.getElementById('game-status-badge');

  if (statusBadge) {
    statusBadge.textContent = formatStatus(game.status);
    statusBadge.className = `status-badge ${game.status.replace('_', '-')}`;
  }
}

function formatStatus(status: GameStatus): string {
  switch (status) {
    case GameStatus.NOT_STARTED:
      return 'Not Started';
    case GameStatus.FIRST_HALF:
      return 'First Half';
    case GameStatus.HALFTIME:
      return 'Halftime';
    case GameStatus.SECOND_HALF:
      return 'Second Half';
    case GameStatus.FINISHED:
      return 'Finished';
    default:
      return status;
  }
}
