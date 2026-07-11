/**
 * Games list page for Discore
 * Displays all games grouped by tournament, inspired by live-frisbee events layout
 */

import {
  GameSummary,
  GameStatus,
} from '@scorebot/shared';
import { fetchGames, poll } from './api/gameClient.js';

const POLL_INTERVAL = 10000;

interface TournamentGroup {
  tournamentName: string;
  games: GameSummary[];
}

class GamesListApp {
  private stopPolling: (() => void) | null = null;

  constructor() {
    this.init();
  }

  async init() {
    await this.loadGames();
    this.setupPolling();
  }

  private setupPolling() {
    this.stopPolling = poll(() => this.loadGames(), POLL_INTERVAL);
  }

  private async loadGames() {
    try {
      const games = await fetchGames();
      this.renderGames(games);
    } catch (error) {
      console.error('Error loading games:', error);
      this.showError('Failed to load games. Please try again later.');
    }
  }

  private renderGames(games: GameSummary[]) {
    const container = document.getElementById('games-container');
    const countEl = document.getElementById('game-count');

    if (!container) return;

    if (countEl) {
      const wins = games.filter(g => g.status === GameStatus.FINISHED && g.score.us > g.score.them).length;
      const losses = games.filter(g => g.status === GameStatus.FINISHED && g.score.us < g.score.them).length;
      countEl.textContent = `${games.length} games \u00B7 ${wins}-${losses}`;
    }

    if (games.length === 0) {
      container.innerHTML = '<div class="empty-state">No games found</div>';
      return;
    }

    const tournaments = this.groupByTournament(games);

    container.innerHTML = '';
    tournaments.forEach(tournament => {
      const card = this.createTournamentCard(tournament);
      container.appendChild(card);
    });
  }

  private groupByTournament(games: GameSummary[]): TournamentGroup[] {
    const grouped = new Map<string, GameSummary[]>();

    games.forEach(game => {
      const tournamentName = game.tournamentName || 'Other Games';
      if (!grouped.has(tournamentName)) {
        grouped.set(tournamentName, []);
      }
      grouped.get(tournamentName)!.push(game);
    });

    const tournaments: TournamentGroup[] = [];
    grouped.forEach((games, tournamentName) => {
      games.sort((a, b) => {
        if (a.gameDate && b.gameDate) {
          if (a.gameDate !== b.gameDate) {
            return a.gameDate.localeCompare(b.gameDate);
          }
        } else if (a.gameDate) {
          return -1;
        } else if (b.gameDate) {
          return 1;
        }
        const orderA = a.gameOrder ?? 999;
        const orderB = b.gameOrder ?? 999;
        return orderA - orderB;
      });

      tournaments.push({ tournamentName, games });
    });

    // Most recent tournaments first
    tournaments.sort((a, b) => {
      const dateA = a.games[a.games.length - 1]?.gameDate || '';
      const dateB = b.games[b.games.length - 1]?.gameDate || '';
      return dateB.localeCompare(dateA);
    });

    return tournaments;
  }

  private createTournamentCard(tournament: TournamentGroup): HTMLElement {
    const card = document.createElement('div');
    card.className = 'tournament-card';

    // Date range
    const dateRange = this.getDateRange(tournament.games);
    if (dateRange) {
      const dateRangeEl = document.createElement('div');
      dateRangeEl.className = 'tournament-date-range';
      dateRangeEl.textContent = dateRange;
      card.appendChild(dateRangeEl);
    }

    // Tournament name
    const name = document.createElement('div');
    name.className = 'tournament-name';
    name.textContent = tournament.tournamentName;
    card.appendChild(name);

    // Group games by date, then render with subheaders
    let currentDate = '';
    tournament.games.forEach(game => {
      const gameDate = game.gameDate || '';
      if (gameDate !== currentDate) {
        currentDate = gameDate;
        const subheader = document.createElement('div');
        subheader.className = 'date-subheader';
        subheader.textContent = this.formatDateSubheader(gameDate);
        card.appendChild(subheader);
      }

      const row = this.createGameRow(game);
      card.appendChild(row);
    });

    return card;
  }

  private createGameRow(game: GameSummary): HTMLElement {
    const row = document.createElement('div');
    row.className = 'game-row';
    row.onclick = () => {
      window.location.href = `/index.html?game=${game.id}`;
    };

    // Opponent name
    const opponent = document.createElement('div');
    opponent.className = 'game-opponent';
    opponent.textContent = game.teams.them.name;
    row.appendChild(opponent);

    // Score
    const score = document.createElement('div');
    score.className = 'game-score';
    score.innerHTML = `${game.score.us}<span class="separator">-</span>${game.score.them}`;
    row.appendChild(score);

    // Result badge
    const badge = document.createElement('span');
    badge.className = 'badge';

    const isLive = game.status === GameStatus.FIRST_HALF || game.status === GameStatus.SECOND_HALF;
    const isHalftime = game.status === GameStatus.HALFTIME;
    const isFinished = game.status === GameStatus.FINISHED;

    if (isLive || isHalftime) {
      badge.classList.add('badge-live');
      badge.textContent = isHalftime ? 'Half' : 'Live';
    } else if (isFinished) {
      if (game.score.us > game.score.them) {
        badge.classList.add('badge-won');
        badge.textContent = 'Won';
      } else if (game.score.us < game.score.them) {
        badge.classList.add('badge-lost');
        badge.textContent = 'Lost';
      } else {
        badge.classList.add('badge-draw');
        badge.textContent = 'Draw';
      }
    }

    row.appendChild(badge);

    // Video link
    if (game.videoUrl) {
      const videoLink = document.createElement('a');
      videoLink.className = 'game-video';
      videoLink.href = game.videoUrl;
      videoLink.target = '_blank';
      videoLink.rel = 'noopener';
      videoLink.textContent = '\u25B6';
      videoLink.title = 'Watch video';
      videoLink.onclick = (e) => e.stopPropagation();
      row.appendChild(videoLink);
    }

    return row;
  }

  private getDateRange(games: GameSummary[]): string | null {
    const dates = games
      .map(g => g.gameDate)
      .filter((d): d is string => !!d)
      .sort();

    if (dates.length === 0) return null;

    const first = this.formatDateLong(dates[0]);
    const last = this.formatDateLong(dates[dates.length - 1]);

    if (first === last) return first;
    return `${first} \u2013 ${last}`;
  }

  private formatDateLong(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatDateSubheader(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  private showError(message: string) {
    const errorView = document.getElementById('error-view');
    const errorText = document.getElementById('error-text');
    const gamesContainer = document.getElementById('games-container');

    if (errorView && errorText && gamesContainer) {
      errorText.textContent = message;
      errorView.classList.remove('hidden');
      gamesContainer.classList.add('hidden');
    }
  }
}

new GamesListApp();
