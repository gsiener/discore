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
  team?: TeamSide; // Which team (for goals)
  message?: string; // Original message or note
  parsedBy?: string; // Who/what created this event (e.g., 'whatsapp:+1234567890' or 'command')
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
}

/**
 * API Request/Response types
 */

export interface CreateGameRequest {
  chatId: string;
  ourTeamName: string;
  opponentName: string;
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
}

export interface AddEventResponse {
  event: GameEvent;
  game: Game;
}
