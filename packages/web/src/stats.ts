/**
 * Advanced Stats Page for Discore
 * Displays player-level and game context statistics
 */

import {
  AggregatedPlayerStats,
  AdvancedStats,
  GameSummary,
} from '@scorebot/shared';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8787';

class StatsApp {
  private games: GameSummary[] = [];
  private currentGameId: string | null = null;
  private currentTournament: string | null = null;

  constructor() {
    this.init();
  }

  async init() {
    await this.loadGames();
    this.setupEventListeners();
    this.loadStats();
  }

  private setupEventListeners() {
    const gameFilter = document.getElementById('game-filter') as HTMLSelectElement;
    const tournamentFilter = document.getElementById('tournament-filter') as HTMLSelectElement;

    gameFilter.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.currentGameId = target.value || null;
      this.loadStats();
    });

    tournamentFilter.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.currentTournament = target.value || null;
      this.updateGameFilter();
      this.loadStats();
    });
  }

  private async loadGames() {
    try {
      const response = await fetch(`${API_BASE_URL}/games?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch games');

      const data = await response.json();
      this.games = data.games;

      this.populateTournamentFilter();
      this.updateGameFilter();
    } catch (error) {
      console.error('Error loading games:', error);
      this.showError('Failed to load games. Please try again later.');
    }
  }

  private populateTournamentFilter() {
    const select = document.getElementById('tournament-filter') as HTMLSelectElement;

    // Get unique tournaments
    const tournaments = new Set<string>();
    this.games.forEach(game => {
      if (game.tournamentName) {
        tournaments.add(game.tournamentName);
      }
    });

    // Clear and repopulate
    select.innerHTML = '<option value="">All Tournaments</option>';
    Array.from(tournaments).sort().forEach(tournament => {
      const option = document.createElement('option');
      option.value = tournament;
      option.textContent = tournament;
      select.appendChild(option);
    });
  }

  private updateGameFilter() {
    const select = document.getElementById('game-filter') as HTMLSelectElement;

    // Filter games by tournament
    let filteredGames = this.games;
    if (this.currentTournament) {
      filteredGames = this.games.filter(g => g.tournamentName === this.currentTournament);
    }

    // Clear and repopulate
    select.innerHTML = '<option value="">All Games (Aggregated)</option>';

    // Group by date
    const grouped = new Map<string, GameSummary[]>();
    filteredGames.forEach(game => {
      const date = game.gameDate || 'Unknown Date';
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(game);
    });

    // Sort dates and render
    const sortedDates = Array.from(grouped.keys()).sort().reverse();
    sortedDates.forEach(date => {
      const dateGames = grouped.get(date)!;
      dateGames.sort((a, b) => (a.gameOrder || 0) - (b.gameOrder || 0));

      dateGames.forEach(game => {
        const option = document.createElement('option');
        option.value = game.id;

        let dateLabel = date;
        if (date !== 'Unknown Date') {
          const dateObj = new Date(date + 'T00:00:00');
          dateLabel = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        }

        option.textContent = `${dateLabel}: ${game.teams.us.name} vs ${game.teams.them.name}`;
        select.appendChild(option);
      });
    });
  }

  private async loadStats() {
    this.showLoading();

    try {
      if (this.currentGameId) {
        // Load single game stats
        await this.loadGameStats(this.currentGameId);
      } else {
        // Load aggregated stats
        await this.loadAggregatedStats();
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      this.showError('Failed to load statistics. Please try again later.');
    }
  }

  private async loadGameStats(gameId: string) {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/stats`);
    if (!response.ok) throw new Error('Failed to fetch game stats');

    const data = await response.json();
    const stats: AdvancedStats = data.stats;

    this.renderGameStats(stats);
  }

  private async loadAggregatedStats() {
    let url = `${API_BASE_URL}/stats/aggregated?limit=100`;
    if (this.currentTournament) {
      url += `&tournament=${encodeURIComponent(this.currentTournament)}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch aggregated stats');

    const data = await response.json();

    this.renderAggregatedStats(data.players, data.totalGames);
  }

  private renderGameStats(stats: AdvancedStats) {
    // Show stats view
    this.showStats();

    // Render player stats
    this.renderPlayerStatsTable(stats.playerStats, false);

    // Render game context stats
    this.renderGameContext(stats.gameContext);

    // Show game context section
    const gameContextSection = document.getElementById('game-context-section');
    if (gameContextSection) {
      gameContextSection.classList.remove('hidden');
    }
  }

  private renderAggregatedStats(players: AggregatedPlayerStats[], totalGames: number) {
    // Show stats view
    this.showStats();

    // Render player stats
    this.renderPlayerStatsTable(players, true);

    // Hide game context section for aggregated view
    const gameContextSection = document.getElementById('game-context-section');
    if (gameContextSection) {
      gameContextSection.classList.add('hidden');
    }
  }

  private renderPlayerStatsTable(
    players: any[],
    isAggregated: boolean
  ) {
    const tbody = document.querySelector('#player-stats-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (players.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 9;
      cell.textContent = 'No player stats available';
      cell.style.textAlign = 'center';
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    players.forEach(player => {
      const row = document.createElement('tr');

      // Name
      const nameCell = document.createElement('td');
      nameCell.textContent = player.name;
      nameCell.className = 'player-name';
      row.appendChild(nameCell);

      // Goals
      const goalsCell = document.createElement('td');
      goalsCell.textContent = player.goals.toString();
      row.appendChild(goalsCell);

      // Assists
      const assistsCell = document.createElement('td');
      assistsCell.textContent = player.assists.toString();
      row.appendChild(assistsCell);

      // Blocks
      const blocksCell = document.createElement('td');
      blocksCell.textContent = player.blocks.toString();
      row.appendChild(blocksCell);

      // Steals
      const stealsCell = document.createElement('td');
      stealsCell.textContent = player.steals.toString();
      row.appendChild(stealsCell);

      // Points Played
      const pointsCell = document.createElement('td');
      pointsCell.textContent = player.pointsPlayed.toString();
      row.appendChild(pointsCell);

      // Plus/Minus
      const plusMinusCell = document.createElement('td');
      const plusMinus = player.plusMinus;
      plusMinusCell.textContent = plusMinus >= 0 ? `+${plusMinus}` : plusMinus.toString();
      plusMinusCell.className = plusMinus >= 0 ? 'positive' : 'negative';
      row.appendChild(plusMinusCell);

      // Per-game stats (only for aggregated)
      if (isAggregated) {
        const goalsPerGameCell = document.createElement('td');
        goalsPerGameCell.className = 'mobile-hidden';
        goalsPerGameCell.textContent = player.goalsPerGame.toFixed(1);
        row.appendChild(goalsPerGameCell);

        const assistsPerGameCell = document.createElement('td');
        assistsPerGameCell.className = 'mobile-hidden';
        assistsPerGameCell.textContent = player.assistsPerGame.toFixed(1);
        row.appendChild(assistsPerGameCell);
      } else {
        // Empty cells for non-aggregated
        const emptyCell1 = document.createElement('td');
        emptyCell1.className = 'mobile-hidden';
        emptyCell1.textContent = '-';
        row.appendChild(emptyCell1);

        const emptyCell2 = document.createElement('td');
        emptyCell2.className = 'mobile-hidden';
        emptyCell2.textContent = '-';
        row.appendChild(emptyCell2);
      }

      tbody.appendChild(row);
    });
  }

  private renderGameContext(gameContext: any) {
    // Momentum stats
    const momentum = gameContext.momentum;
    this.setTextContent('momentum-largest-lead', momentum.largestLead);
    this.setTextContent('momentum-largest-deficit', momentum.largestDeficit);
    this.setTextContent('momentum-lead-changes', momentum.leadChanges);
    this.setTextContent('momentum-max-comeback', momentum.maxComebackFrom);

    // Half performance
    const half = gameContext.halfPerformance;
    this.setTextContent('half-first-score', `${half.firstHalf.ourScore}-${half.firstHalf.theirScore}`);
    this.setTextContent('half-first-diff', this.formatDiff(half.firstHalf.scoreDifferential));
    this.setTextContent('half-second-score', `${half.secondHalf.ourScore}-${half.secondHalf.theirScore}`);
    this.setTextContent('half-second-diff', this.formatDiff(half.secondHalf.scoreDifferential));

    // Timeout efficiency
    const timeout = gameContext.timeoutEfficiency;
    this.setTextContent('timeout-total', timeout.totalTimeouts);
    this.setTextContent('timeout-conversion', `${timeout.conversionRate.toFixed(0)}%`);
    this.setTextContent('timeout-scored-after', timeout.pointsScoredAfterTimeout);
    this.setTextContent('timeout-allowed-after', timeout.pointsAllowedAfterTimeout);

    // Close game performance
    const close = gameContext.closeGamePerformance;
    this.setTextContent('close-points-played', close.pointsPlayedWithin2);
    this.setTextContent('close-score-diff', this.formatDiff(close.scoreDifferentialWithin2));
  }

  private formatDiff(diff: number): string {
    return diff >= 0 ? `+${diff}` : diff.toString();
  }

  private setTextContent(id: string, value: any) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value.toString();
    }
  }

  private showLoading() {
    const loadingView = document.getElementById('loading-view');
    const statsView = document.getElementById('stats-view');
    const errorView = document.getElementById('error-view');

    if (loadingView) loadingView.classList.remove('hidden');
    if (statsView) statsView.classList.add('hidden');
    if (errorView) errorView.classList.add('hidden');
  }

  private showStats() {
    const loadingView = document.getElementById('loading-view');
    const statsView = document.getElementById('stats-view');
    const errorView = document.getElementById('error-view');

    if (loadingView) loadingView.classList.add('hidden');
    if (statsView) statsView.classList.remove('hidden');
    if (errorView) errorView.classList.add('hidden');
  }

  private showError(message: string) {
    const errorView = document.getElementById('error-view');
    const errorText = document.getElementById('error-text');
    const statsView = document.getElementById('stats-view');
    const loadingView = document.getElementById('loading-view');

    if (errorView && errorText && statsView && loadingView) {
      errorText.textContent = message;
      errorView.classList.remove('hidden');
      statsView.classList.add('hidden');
      loadingView.classList.add('hidden');
    }
  }
}

// Initialize app when DOM is ready
new StatsApp();
