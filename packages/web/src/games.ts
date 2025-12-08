/**
 * Games list page for Discore
 * Displays all games grouped by tournament
 */

import {
  GameSummary,
  GameStatus,
  formatScore,
  formatTime,
} from '@scorebot/shared';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8787';
const POLL_INTERVAL = 10000; // 10 seconds

interface TournamentGroup {
  tournamentName: string;
  games: GameSummary[];
}

class GamesListApp {
  private pollInterval: number | null = null;

  constructor() {
    this.init();
  }

  async init() {
    await this.loadGames();
    this.setupPolling();
  }

  private setupPolling() {
    // Poll for updates
    this.pollInterval = window.setInterval(() => {
      this.loadGames();
    }, POLL_INTERVAL);
  }

  private async loadGames() {
    try {
      const response = await fetch(`${API_BASE_URL}/games?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch games');

      const data = await response.json();
      this.renderGames(data.games);
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
      countEl.textContent = `Showing ${games.length} game${games.length !== 1 ? 's' : ''}`;
    }

    if (games.length === 0) {
      container.innerHTML = '<div class="empty-state">No games found</div>';
      return;
    }

    // Group games by tournament
    const tournaments = this.groupByTournament(games);

    // Render
    container.innerHTML = '';
    tournaments.forEach(tournament => {
      const section = this.createTournamentSection(tournament);
      container.appendChild(section);
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

    // Convert to array and sort games within each tournament by date and order
    const tournaments: TournamentGroup[] = [];
    grouped.forEach((games, tournamentName) => {
      // Sort games by date (desc) and gameOrder (asc)
      games.sort((a, b) => {
        // First sort by date (most recent first)
        if (a.gameDate && b.gameDate) {
          if (a.gameDate !== b.gameDate) {
            return b.gameDate.localeCompare(a.gameDate);
          }
        } else if (a.gameDate) {
          return -1;
        } else if (b.gameDate) {
          return 1;
        }

        // Then by game order
        const orderA = a.gameOrder ?? 999;
        const orderB = b.gameOrder ?? 999;
        return orderA - orderB;
      });

      tournaments.push({ tournamentName, games });
    });

    // Sort tournaments by most recent game date
    tournaments.sort((a, b) => {
      const dateA = a.games[0]?.gameDate || '';
      const dateB = b.games[0]?.gameDate || '';
      return dateB.localeCompare(dateA);
    });

    return tournaments;
  }

  private createTournamentSection(tournament: TournamentGroup): HTMLElement {
    const section = document.createElement('section');
    section.className = 'tournament-section';

    // Tournament header
    const header = document.createElement('div');
    header.className = 'tournament-header';
    header.textContent = tournament.tournamentName;
    section.appendChild(header);

    // Games table
    const table = document.createElement('table');
    table.className = 'games-table';

    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th class="col-time">Date & Time</th>
        <th class="col-team1">Team 1</th>
        <th class="col-score">Score</th>
        <th class="col-team2">Team 2</th>
        <th class="col-tournament">Tournament</th>
      </tr>
    `;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    tournament.games.forEach(game => {
      const row = this.createGameRow(game);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    section.appendChild(table);

    return section;
  }

  private createGameRow(game: GameSummary): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.className = 'game-row';
    row.onclick = () => {
      window.location.href = `/index.html?game=${game.id}`;
    };

    // Date & Time column
    const timeCell = document.createElement('td');
    timeCell.className = 'col-time';
    if (game.startedAt) {
      const date = new Date(game.startedAt);
      const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const dateDiv = document.createElement('div');
      dateDiv.textContent = dateStr;
      const timeDiv = document.createElement('div');
      timeDiv.textContent = timeStr;

      // Add live indicator
      if (game.status === GameStatus.FIRST_HALF || game.status === GameStatus.SECOND_HALF) {
        const indicator = document.createElement('span');
        indicator.className = 'live-indicator';
        indicator.textContent = '●';
        timeDiv.prepend(indicator);
      }

      timeCell.appendChild(dateDiv);
      timeCell.appendChild(timeDiv);
    } else {
      timeCell.textContent = '-';
    }

    // Team 1 column
    const team1Cell = document.createElement('td');
    team1Cell.className = 'col-team1';
    const team1Name = document.createElement('span');
    team1Name.className = 'team-name';
    team1Name.textContent = game.teams.us.name;
    team1Cell.appendChild(team1Name);

    // Score column
    const scoreCell = document.createElement('td');
    scoreCell.className = 'col-score';

    const usScore = game.score.us;
    const themScore = game.score.them;
    const usWon = game.status === GameStatus.FINISHED && usScore > themScore;
    const themWon = game.status === GameStatus.FINISHED && themScore > usScore;

    const score1 = document.createElement('span');
    score1.className = usWon ? 'score-winner' : 'score';
    score1.textContent = usScore.toString();

    if (usWon) {
      const arrow = document.createElement('span');
      arrow.className = 'winner-arrow';
      arrow.textContent = '◀';
      score1.prepend(arrow);
    }

    const separator = document.createElement('span');
    separator.className = 'score-separator';
    separator.textContent = ' - ';

    const score2 = document.createElement('span');
    score2.className = themWon ? 'score-winner' : 'score';
    score2.textContent = themScore.toString();

    if (themWon) {
      const arrow = document.createElement('span');
      arrow.className = 'winner-arrow';
      arrow.textContent = '▶';
      score2.appendChild(arrow);
    }

    scoreCell.appendChild(score1);
    scoreCell.appendChild(separator);
    scoreCell.appendChild(score2);

    // Team 2 column
    const team2Cell = document.createElement('td');
    team2Cell.className = 'col-team2';
    const team2Name = document.createElement('span');
    team2Name.className = 'team-name';
    team2Name.textContent = game.teams.them.name;
    team2Cell.appendChild(team2Name);

    // Tournament column
    const tournamentCell = document.createElement('td');
    tournamentCell.className = 'col-tournament';
    tournamentCell.textContent = this.formatStatus(game.status);

    row.appendChild(timeCell);
    row.appendChild(team1Cell);
    row.appendChild(scoreCell);
    row.appendChild(team2Cell);
    row.appendChild(tournamentCell);

    return row;
  }

  private formatStatus(status: GameStatus): string {
    switch (status) {
      case GameStatus.NOT_STARTED:
        return 'Not Started';
      case GameStatus.FIRST_HALF:
        return 'Live';
      case GameStatus.HALFTIME:
        return 'Halftime';
      case GameStatus.SECOND_HALF:
        return 'Live';
      case GameStatus.FINISHED:
        return 'Final';
      default:
        return status;
    }
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

// Initialize app when DOM is ready
new GamesListApp();
