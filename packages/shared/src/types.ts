/**
 * Shared types for Scorebot
 */

export enum GameStatus {
  NOT_STARTED = 'not_started',
  FIRST_HALF = 'first_half',
  HALFTIME = 'halftime',
  SECOND_HALF = 'second_half',
  FINISHED = 'finished',
}

export enum EventType {
  GAME_START = 'game_start',
  GOAL = 'goal',
  HALFTIME = 'halftime',
  SECOND_HALF_START = 'second_half_start',
  GAME_END = 'game_end',
  TIMEOUT = 'timeout',
  NOTE = 'note', // For general comments/notes
}

export enum TeamSide {
  US = 'us',
  THEM = 'them',
}

export interface Team {
  name: string;
  side: TeamSide;
}

export interface Score {
  us: number;
  them: number;
}

export interface GameEvent {
  id: string;
  gameId: string;
  type: EventType;
  timestamp: number; // Unix timestamp in milliseconds
  score: Score; // Score after this event
  team?: TeamSide; // Which team (for goals, timeouts)
  message?: string; // Original message or note
  parsedBy?: string; // Who/what created this event (e.g., 'whatsapp:+1234567890' or 'command')
  defensivePlay?: 'block' | 'steal'; // For goals scored off defensive plays
}

export interface Game {
  id: string;
  status: GameStatus;
  teams: {
    us: Team;
    them: Team;
  };
  score: Score;
  events: GameEvent[];
  startedAt?: number; // Unix timestamp in milliseconds
  finishedAt?: number; // Unix timestamp in milliseconds
  chatId?: string; // WhatsApp chat ID
  startingOnOffense?: boolean; // True if our team started on offense
  tournamentName?: string; // Tournament name (e.g., "Fall Flock 2024")
  gameDate?: string; // Game date in YYYY-MM-DD format
  gameOrder?: number; // Order within the same day/tournament
  createdAt: number;
  updatedAt: number;
}

export interface GameSummary {
  id: string;
  status: GameStatus;
  teams: {
    us: Team;
    them: Team;
  };
  score: Score;
  startedAt?: number;
  finishedAt?: number;
  startingOnOffense?: boolean;
  tournamentName?: string;
  gameDate?: string;
  gameOrder?: number;
}

/**
 * API Request/Response types
 */

export interface CreateGameRequest {
  chatId: string;
  ourTeamName: string;
  opponentName: string;
  tournamentName?: string;
  gameDate?: string;
  gameOrder?: number;
}

export interface CreateGameResponse {
  game: Game;
}

export interface GetGameResponse {
  game: Game;
}

export interface ListGamesResponse {
  games: GameSummary[];
}

export interface AddEventRequest {
  type: EventType;
  team?: TeamSide;
  message?: string;
  defensivePlay?: 'block' | 'steal';
  startingOnOffense?: boolean;
  timestamp?: number; // Optional custom timestamp for backfilling events
  score?: Score; // Optional score for backfilling events (score at time of event)
}

export interface AddEventResponse {
  event: GameEvent;
  game: Game;
}

/**
 * O-line/D-line efficiency statistics
 */
export interface LineStats {
  oLinePoints: number; // Total O-line points played
  oLineHolds: number; // O-line points that resulted in holds
  oLineHoldPercentage: number; // Percentage of O-line holds
  dLinePoints: number; // Total D-line points played
  dLineBreaks: number; // D-line points that resulted in breaks
  dLineBreakPercentage: number; // Percentage of D-line breaks
}

/**
 * Player-level statistics
 */
export interface PlayerStats {
  name: string;
  goals: number; // Total goals scored
  assists: number; // Total assists (thrower on scoring plays)
  blocks: number; // Total blocks
  steals: number; // Total steals
  pointsPlayed: number; // Approximate count of points played (based on event appearances)
  plusMinus: number; // Score differential when player was on field
  touches: number; // Total times player is mentioned in events
}

/**
 * Momentum tracking information
 */
export interface MomentumInfo {
  largestLead: number; // Largest lead our team had
  largestDeficit: number; // Largest deficit our team faced
  leadChanges: number; // Number of times the lead changed
  comebackPoints: number; // Points scored after being down
  maxComebackFrom: number; // Largest deficit we came back from
}

/**
 * Half performance breakdown
 */
export interface HalfPerformance {
  firstHalf: {
    ourScore: number;
    theirScore: number;
    scoreDifferential: number;
  };
  secondHalf: {
    ourScore: number;
    theirScore: number;
    scoreDifferential: number;
  };
}

/**
 * Timeout efficiency stats
 */
export interface TimeoutEfficiency {
  totalTimeouts: number; // Total timeouts called by our team
  timeoutsInFirstHalf: number;
  timeoutsInSecondHalf: number;
  pointsScoredAfterTimeout: number; // Points we scored immediately after our timeout
  pointsAllowedAfterTimeout: number; // Points opponent scored immediately after our timeout
  conversionRate: number; // Percentage of timeouts that led to us scoring the next point
}

/**
 * Game context statistics
 */
export interface GameContextStats {
  momentum: MomentumInfo;
  halfPerformance: HalfPerformance;
  timeoutEfficiency: TimeoutEfficiency;
  closeGamePerformance: {
    pointsPlayedWithin2: number; // Points played when within 2 points
    scoreDifferentialWithin2: number; // Our scoring diff in close situations
  };
}

/**
 * Advanced statistics for a game
 */
export interface AdvancedStats {
  gameId: string;
  gameDate?: string;
  tournamentName?: string;
  ourTeamName: string;
  opponentName: string;
  finalScore: Score;
  playerStats: PlayerStats[];
  gameContext: GameContextStats;
}

/**
 * Aggregated player statistics across multiple games
 */
export interface AggregatedPlayerStats extends PlayerStats {
  gamesPlayed: number;
  goalsPerGame: number;
  assistsPerGame: number;
  blocksPerGame: number;
  stealsPerGame: number;
}

/**
 * Response for advanced stats endpoints
 */
export interface GetAdvancedStatsResponse {
  stats: AdvancedStats;
}

export interface GetAggregatedStatsResponse {
  players: AggregatedPlayerStats[];
  totalGames: number;
  dateRange?: {
    from: string;
    to: string;
  };
}
