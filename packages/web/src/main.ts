/**
 * Web interface for Scorebot
 * Polls API for game updates and displays timeline
 */

import {
  Game,
  GameEvent,
  GameStatus,
  EventType,
  formatTime,
  formatScore,
  getGameDuration,
} from '@scorebot/shared';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8787';
const POLL_INTERVAL = 3000; // 3 seconds

class ScorebotApp {
  private currentGameId: string | null = null;
  private pollInterval: number | null = null;

  constructor() {
    this.init();
  }

  async init() {
    await this.loadGames();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const gameSelect = document.getElementById(
      'game-select'
    ) as HTMLSelectElement;
    gameSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.selectGame(target.value);
    });
  }

  private async loadGames() {
    try {
      const response = await fetch(`${API_BASE_URL}/games`);
      if (!response.ok) throw new Error('Failed to fetch games');

      const data = await response.json();
      this.renderGameSelector(data.games);

      // Auto-select first game if available
      if (data.games.length > 0) {
        this.selectGame(data.games[0].id);
      }
    } catch (error) {
      console.error('Error loading games:', error);
      this.showError('Failed to load games. Please try again later.');
    }
  }

  private renderGameSelector(games: any[]) {
    const select = document.getElementById('game-select') as HTMLSelectElement;
    select.innerHTML = '';

    if (games.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No games available';
      select.appendChild(option);
      return;
    }

    games.forEach((game) => {
      const option = document.createElement('option');
      option.value = game.id;
      option.textContent = `${game.teams.us.name} vs ${game.teams.them.name} (${formatScore(game.score)})`;
      select.appendChild(option);
    });
  }

  private selectGame(gameId: string) {
    if (this.currentGameId === gameId) return;

    this.currentGameId = gameId;

    // Clear existing poll
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    if (!gameId) {
      this.hideGame();
      return;
    }

    // Load game immediately
    this.loadGame();

    // Start polling
    this.pollInterval = window.setInterval(() => {
      this.loadGame();
    }, POLL_INTERVAL);
  }

  private async loadGame() {
    if (!this.currentGameId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/games/${this.currentGameId}`
      );
      if (!response.ok) throw new Error('Failed to fetch game');

      const data = await response.json();
      this.renderGame(data.game);
    } catch (error) {
      console.error('Error loading game:', error);
      this.showError('Failed to load game data.');
    }
  }

  private renderGame(game: Game) {
    // Show game view
    const gameView = document.getElementById('game-view');
    const errorView = document.getElementById('error-view');
    if (gameView && errorView) {
      gameView.classList.remove('hidden');
      errorView.classList.add('hidden');
    }

    // Update team names
    const teamUs = document.getElementById('team-us');
    const teamThem = document.getElementById('team-them');
    if (teamUs) teamUs.textContent = game.teams.us.name;
    if (teamThem) teamThem.textContent = game.teams.them.name;

    // Update scores
    const scoreUs = document.getElementById('score-us');
    const scoreThem = document.getElementById('score-them');
    if (scoreUs) scoreUs.textContent = game.score.us.toString();
    if (scoreThem) scoreThem.textContent = game.score.them.toString();

    // Update status
    this.renderStatus(game);

    // Update timeline
    this.renderTimeline(game.events);
  }

  private renderStatus(game: Game) {
    const statusBadge = document.getElementById('game-status-badge');
    const durationEl = document.getElementById('game-duration');

    if (statusBadge) {
      statusBadge.textContent = this.formatStatus(game.status);
      statusBadge.className = `status-badge ${game.status.replace('_', '-')}`;
    }

    if (durationEl) {
      const duration = getGameDuration(game);
      if (duration !== null) {
        durationEl.textContent = `${duration} min`;
      } else {
        durationEl.textContent = '';
      }
    }
  }

  private formatStatus(status: GameStatus): string {
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

  private renderTimeline(events: GameEvent[]) {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    if (events.length === 0) {
      timeline.innerHTML = '<p class="empty-state">No events yet</p>';
      return;
    }

    timeline.innerHTML = '';

    // Render events in reverse order (most recent first)
    [...events].reverse().forEach((event) => {
      const eventEl = this.createEventElement(event);
      timeline.appendChild(eventEl);
    });
  }

  private createEventElement(event: GameEvent): HTMLElement {
    const div = document.createElement('div');
    div.className = 'timeline-event';

    if (event.type === EventType.GOAL && event.team) {
      div.classList.add(`goal-${event.team}`);
    }

    const time = document.createElement('div');
    time.className = 'event-time';
    time.textContent = formatTime(event.timestamp);

    const type = document.createElement('div');
    type.className = 'event-type';
    type.textContent = this.formatEventType(event);

    const score = document.createElement('div');
    score.className = 'event-score';
    score.textContent = formatScore(event.score);

    div.appendChild(time);
    div.appendChild(type);
    div.appendChild(score);

    if (event.message) {
      const message = document.createElement('div');
      message.className = 'event-message';
      message.textContent = event.message;
      div.appendChild(message);
    }

    return div;
  }

  private formatEventType(event: GameEvent): string {
    switch (event.type) {
      case EventType.GAME_START:
        return 'Game Started';
      case EventType.GOAL:
        return event.team === 'us' ? 'Goal - Us!' : 'Goal - Them';
      case EventType.HALFTIME:
        return 'Halftime';
      case EventType.SECOND_HALF_START:
        return 'Second Half Started';
      case EventType.GAME_END:
        return 'Game Ended';
      case EventType.TIMEOUT:
        return 'Timeout';
      case EventType.NOTE:
        return 'Note';
      default:
        return event.type;
    }
  }

  private hideGame() {
    const gameView = document.getElementById('game-view');
    if (gameView) {
      gameView.classList.add('hidden');
    }
  }

  private showError(message: string) {
    const errorView = document.getElementById('error-view');
    const errorText = document.getElementById('error-text');
    const gameView = document.getElementById('game-view');

    if (errorView && errorText && gameView) {
      errorText.textContent = message;
      errorView.classList.remove('hidden');
      gameView.classList.add('hidden');
    }
  }
}

// Initialize app when DOM is ready
new ScorebotApp();
