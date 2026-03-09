/**
 * Web interface for Discore
 * Orchestrates game selection, polling, and component rendering
 */

import type { Game } from '@scorebot/shared';
import { formatScore } from '@scorebot/shared';
import { fetchGames, fetchGame } from './api/gameClient.js';
import { renderGameHeader } from './components/gameHeader.js';
import { renderTimeline } from './components/timeline.js';
import { renderProgressionTable } from './components/progressionTable.js';
import { renderEfficiencyStats } from './components/efficiencyStats.js';

const POLL_INTERVAL = 3000; // 3 seconds

class DiscoreApp {
  private currentGameId: string | null = null;
  private pollInterval: number | null = null;

  constructor() {
    this.init();
  }

  async init() {
    const urlGameId = new URLSearchParams(window.location.search).get('game');
    await this.loadGames(urlGameId);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const gameSelect = document.getElementById(
      'game-select'
    ) as HTMLSelectElement;
    gameSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const gameId = target.value;
      this.selectGame(gameId);
      // Update URL so refresh stays on this game
      const url = new URL(window.location.href);
      if (gameId) {
        url.searchParams.set('game', gameId);
      } else {
        url.searchParams.delete('game');
      }
      window.history.replaceState({}, '', url.toString());
    });
  }

  private async loadGames(initialGameId?: string | null) {
    try {
      const games = await fetchGames();
      this.renderGameSelector(games);

      // Select URL game if provided, otherwise first game
      const gameId = initialGameId || (games.length > 0 ? games[0].id : null);
      if (gameId) {
        const select = document.getElementById('game-select') as HTMLSelectElement;
        if (select) select.value = gameId;
        this.selectGame(gameId);
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

    // Group games by tournament and date
    const grouped = new Map<string, Map<string, any[]>>();

    games.forEach((game) => {
      const tournament = game.tournamentName || 'Other Games';
      const date = game.gameDate || 'Unknown Date';

      if (!grouped.has(tournament)) {
        grouped.set(tournament, new Map());
      }

      const tournamentGroup = grouped.get(tournament)!;
      if (!tournamentGroup.has(date)) {
        tournamentGroup.set(date, []);
      }

      tournamentGroup.get(date)!.push(game);
    });

    // Render grouped games
    grouped.forEach((dateGroups, tournament) => {
      dateGroups.forEach((dateGames, date) => {
        const optgroup = document.createElement('optgroup');

        // Format date for display
        let dateLabel = date;
        if (date !== 'Unknown Date') {
          const dateObj = new Date(date + 'T00:00:00');
          dateLabel = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }

        optgroup.label = `${tournament} - ${dateLabel}`;

        // Sort games by gameOrder within the date group
        dateGames.sort((a: any, b: any) => (a.gameOrder || 0) - (b.gameOrder || 0));

        dateGames.forEach((game: any) => {
          const option = document.createElement('option');
          option.value = game.id;
          option.textContent = `${game.teams.us.name} vs ${game.teams.them.name} (${formatScore(game.score)})`;
          optgroup.appendChild(option);
        });

        select.appendChild(optgroup);
      });
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
      const game = await fetchGame(this.currentGameId);
      this.renderGame(game);
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

    // Render all components
    renderGameHeader(game);
    renderProgressionTable(game);
    renderEfficiencyStats(game);
    renderTimeline(game);
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
new DiscoreApp();
