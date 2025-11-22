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

    // Update game metadata
    this.renderGameMeta(game);

    // Update team names
    const teamUs = document.getElementById('team-us');
    const teamThem = document.getElementById('team-them');
    if (teamUs) teamUs.textContent = game.teams.us.name;
    if (teamThem) teamThem.textContent = game.teams.them.name;

    // Update scores with winner indicator
    const scoreUs = document.getElementById('score-us');
    const scoreThem = document.getElementById('score-them');

    if (scoreUs && scoreThem) {
      const isFinished = game.status === GameStatus.FINISHED;
      const weWon = game.score.us > game.score.them;
      const theyWon = game.score.them > game.score.us;

      // Add winner arrow if game is finished
      if (isFinished && weWon) {
        scoreUs.innerHTML = `◀ ${game.score.us}`;
        scoreThem.textContent = game.score.them.toString();
      } else if (isFinished && theyWon) {
        scoreUs.textContent = game.score.us.toString();
        scoreThem.innerHTML = `${game.score.them} ▶`;
      } else {
        scoreUs.textContent = game.score.us.toString();
        scoreThem.textContent = game.score.them.toString();
      }
    }

    // Update status
    this.renderStatus(game);

    // Update progression table
    this.renderProgressionTable(game);

    // Update timeline
    this.renderTimeline(game.events, game);
  }

  private renderGameMeta(game: Game) {
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

  private renderStatus(game: Game) {
    const statusBadge = document.getElementById('game-status-badge');

    if (statusBadge) {
      statusBadge.textContent = this.formatStatus(game.status);
      statusBadge.className = `status-badge ${game.status.replace('_', '-')}`;
    }
  }

  private renderProgressionTable(game: Game) {
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

    // Find halftime event index
    const halftimeEvent = game.events.find(e => e.type === EventType.HALFTIME);
    let halftimePointIndex = -1;
    if (halftimeEvent) {
      // Find the goal event that happened just before halftime
      for (let i = 0; i < goalEvents.length; i++) {
        if (goalEvents[i].timestamp < halftimeEvent.timestamp) {
          halftimePointIndex = i;
        } else {
          break;
        }
      }
    }

    // Detect breaks (same team scores consecutively)
    const isBreak = (index: number): boolean => {
      const currentEvent = goalEvents[index];

      // For the first goal, check if we have startingOnOffense info
      if (index === 0 && game.startingOnOffense !== undefined && currentEvent.team === 'us') {
        // If we started on offense and we scored first, it's a hold
        // If we started on defense and we scored first, it's a break
        return !game.startingOnOffense;
      }

      if (index === 0) return false;

      const prevEvent = goalEvents[index - 1];
      return currentEvent.team === prevEvent.team;
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

  private renderTimeline(events: GameEvent[], game: Game) {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    if (events.length === 0) {
      timeline.innerHTML = '<p class="empty-state">No events yet</p>';
      return;
    }

    timeline.innerHTML = '';

    // Filter out game end events and render in reverse order (most recent first)
    const filteredEvents = events.filter(e => e.type !== EventType.GAME_END);
    const reversedEvents = [...filteredEvents].reverse();
    reversedEvents.forEach((event, index) => {
      const eventEl = this.createEventElement(event, game, events);
      timeline.appendChild(eventEl);
    });
  }

  private createEventElement(event: GameEvent, game: Game, allEvents: GameEvent[]): HTMLElement {
    const div = document.createElement('div');
    div.className = 'timeline-event';

    if (event.type === EventType.GOAL && event.team) {
      div.classList.add(`goal-${event.team}`);
    }

    // Left side: event info
    const leftCol = document.createElement('div');
    leftCol.className = 'event-left';

    // Main event header (time + icon + event type on one line)
    const header = document.createElement('div');
    header.className = 'event-header';

    const time = document.createElement('span');
    time.className = 'event-time';
    time.textContent = formatTime(event.timestamp);

    const icon = document.createElement('span');
    icon.className = 'event-icon';
    icon.textContent = this.getEventIcon(event, allEvents, game);

    const type = document.createElement('span');
    type.className = 'event-type';
    type.textContent = this.formatEventType(event, game, allEvents);

    header.appendChild(time);
    header.appendChild(icon);
    header.appendChild(type);
    leftCol.appendChild(header);

    // Show defensive play indicator if present
    if (event.defensivePlay && event.team === 'us') {
      const defensivePlayEl = document.createElement('div');
      defensivePlayEl.className = 'event-details defensive-play';
      defensivePlayEl.textContent = event.defensivePlay === 'block' ? '🛡️ Block' : '🏃 Steal';
      leftCol.appendChild(defensivePlayEl);
    }

    // Only show message for our team's goals (as secondary details)
    if (event.message && event.team === 'us') {
      const message = document.createElement('div');
      message.className = 'event-details';
      message.textContent = event.message;
      leftCol.appendChild(message);
    }

    // Right side: score display
    const rightCol = document.createElement('div');
    rightCol.className = 'event-score-cell';

    const scoreUs = document.createElement('div');
    scoreUs.className = 'score-line score-us';
    scoreUs.innerHTML = `<span class="score-number">${event.score.us}</span> ${game.teams.us.name}`;

    const scoreThem = document.createElement('div');
    scoreThem.className = 'score-line score-them';
    scoreThem.innerHTML = `<span class="score-number">${event.score.them}</span> ${game.teams.them.name}`;

    rightCol.appendChild(scoreUs);
    rightCol.appendChild(scoreThem);

    div.appendChild(leftCol);
    div.appendChild(rightCol);

    return div;
  }

  private getEventIcon(event: GameEvent, allEvents: GameEvent[], game: Game): string {
    switch (event.type) {
      case EventType.GOAL:
        if (!event.team) return '⚽';
        const isBreak = this.isBreakScore(event, allEvents, game);
        return isBreak ? '⚠️' : '✓';
      case EventType.GAME_START:
        return '🏁';
      case EventType.HALFTIME:
        return '⏸️';
      case EventType.SECOND_HALF_START:
        return '▶️';
      case EventType.GAME_END:
        return '🏁';
      case EventType.TIMEOUT:
        return '⏱️';
      case EventType.NOTE:
        return '📝';
      default:
        return '•';
    }
  }

  private formatEventType(event: GameEvent, game: Game, allEvents: GameEvent[]): string {
    switch (event.type) {
      case EventType.GAME_START:
        return 'Game Started';
      case EventType.GOAL:
        if (!event.team) return 'Goal';

        // Determine if this is a hold or break
        const teamName = event.team === 'us' ? game.teams.us.name : game.teams.them.name;
        const isBreak = this.isBreakScore(event, allEvents, game);

        return isBreak
          ? `Break Score for ${teamName}`
          : `Offensive Hold for ${teamName}`;
      case EventType.HALFTIME:
        return 'Halftime';
      case EventType.SECOND_HALF_START:
        return 'Second Half Started';
      case EventType.GAME_END:
        return 'Game Ended';
      case EventType.TIMEOUT:
        const timeoutTeam = event.team === 'us' ? game.teams.us.name : event.team === 'them' ? game.teams.them.name : 'Unknown';
        return `Timeout - ${timeoutTeam}`;
      case EventType.NOTE:
        return 'Note';
      default:
        return event.type;
    }
  }

  private isBreakScore(event: GameEvent, allEvents: GameEvent[], game: Game): boolean {
    // Find the previous goal event
    const eventIndex = allEvents.findIndex(e => e.id === event.id);

    // For the first goal, check if we have startingOnOffense info
    if (eventIndex === 0) {
      if (game.startingOnOffense !== undefined && event.team === 'us') {
        // If we started on offense and we scored first, it's a hold
        // If we started on defense and we scored first, it's a break
        return !game.startingOnOffense;
      }
      return false; // Can't determine without more info
    }

    // Look backwards for the previous goal
    for (let i = eventIndex - 1; i >= 0; i--) {
      const prevEvent = allEvents[i];
      if (prevEvent.type === EventType.GOAL && prevEvent.team) {
        // If same team scored previously, this is a break
        // (they were on defense after the other team received)
        return prevEvent.team === event.team;
      }
    }

    return false;
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
