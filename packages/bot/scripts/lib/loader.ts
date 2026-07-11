/**
 * Tournament loader harness.
 *
 * Replaces the ~22 near-identical one-off load/reload/fix scripts with a single
 * data-driven loader. A tournament is described as PURE DATA (a `TournamentSpec`);
 * this module handles timezone conversion, chatId generation, and the HTTP calls
 * against the Scorebot API (create game -> add events in order -> optional video
 * URL). Games may also REPLACE an existing game (see `existingGameId`).
 *
 * Run a spec with:  SCOREBOT_API_URL=https://api.score.kcuda.org npx tsx scripts/<your-spec>.ts --run
 */

import { AddEventRequest, EventType, TeamSide, Score } from '@scorebot/shared';

/**
 * Base API URL. Defaults to local dev; pointing at production must be explicit
 * via SCOREBOT_API_URL. This is the ONLY place the URL is defined.
 */
export const API_URL = process.env.SCOREBOT_API_URL ?? 'http://localhost:8787';

/** Default IANA timezone for game times when a spec doesn't set one. */
export const DEFAULT_TIMEZONE = 'America/New_York';

/** A single event within a game. `time` is local wall-clock in the spec timezone. */
export interface EventSpec {
  time: string; // 'HH:MM' or 'HH:MM:SS' (24-hour), local to the spec timezone
  type: EventType;
  team?: 'us' | 'them';
  message?: string;
  defensivePlay?: 'block' | 'steal';
  startingOnOffense?: boolean; // usually set at game level; overrides here if present
  score?: Score; // optional explicit score for backfilling
}

/** One game within a tournament. */
export interface GameSpec {
  date: string; // 'YYYY-MM-DD'
  ourTeam: string;
  opponent: string;
  chatId?: string; // defaults to a slug of tournament + date + order/opponent
  startingOnOffense?: boolean; // attached to the game_start event
  gameOrder?: number; // order within the day/tournament
  videoUrl?: string; // link to game video
  existingGameId?: string; // if set, that game is deleted and re-created (replace mode)
  events: EventSpec[];
}

/** A whole tournament: pure data. */
export interface TournamentSpec {
  tournament: string;
  timezone?: string; // IANA zone, default America/New_York
  games: GameSpec[];
}

export interface LoadOptions {
  apiUrl?: string;
  /** Injectable fetch (default globalThis.fetch) so tests can stub the network. */
  fetch?: typeof globalThis.fetch;
  /** Injectable logger (default console.log). */
  log?: (message: string) => void;
}

/**
 * Compute the UTC offset (localWallTime - utc, in ms) that the given IANA zone
 * had at a specific instant. Uses Intl.DateTimeFormat only — no hardcoded
 * offsets, so EST vs EDT falls out of the actual date.
 */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
  }
  // Some engines render midnight as hour 24; normalize to 0.
  const hour = map.hour === 24 ? 0 : map.hour;
  const asIfUtc = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return asIfUtc - utcMs;
}

/**
 * Convert a wall-clock date + time in an IANA timezone to epoch milliseconds.
 * Two-pass so DST transition days resolve correctly.
 */
export function toEpochMs(date: string, time: string, timeZone: string = DEFAULT_TIMEZONE): number {
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) throw new Error(`Invalid date (expected YYYY-MM-DD): ${date}`);
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!timeMatch) throw new Error(`Invalid time (expected HH:MM or HH:MM:SS): ${time}`);

  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  const day = parseInt(dateMatch[3], 10);
  const hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  const second = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

  // Treat the wall time as if it were UTC, then subtract the zone's offset.
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstGuess = naiveUtc - zoneOffsetMs(naiveUtc, timeZone);
  const refinedOffset = zoneOffsetMs(firstGuess, timeZone);
  return naiveUtc - refinedOffset;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultChatId(spec: TournamentSpec, game: GameSpec): string {
  const suffix = game.gameOrder != null ? `game${game.gameOrder}` : slug(game.opponent);
  return `${slug(spec.tournament)}-${game.date}-${suffix}`;
}

/** Map an EventSpec (+ game context) onto the shared AddEventRequest. */
export function toAddEventRequest(event: EventSpec, game: GameSpec, timeZone: string): AddEventRequest {
  const request: AddEventRequest = {
    type: event.type,
    timestamp: toEpochMs(game.date, event.time, timeZone),
  };
  if (event.team) request.team = event.team === 'us' ? TeamSide.US : TeamSide.THEM;
  if (event.message !== undefined) request.message = event.message;
  if (event.defensivePlay) request.defensivePlay = event.defensivePlay;
  if (event.score) request.score = event.score;

  // startingOnOffense: an explicit event-level value wins; otherwise attach the
  // game-level value to the game_start event (matching the load/reload scripts).
  if (event.startingOnOffense !== undefined) {
    request.startingOnOffense = event.startingOnOffense;
  } else if (event.type === EventType.GAME_START && game.startingOnOffense !== undefined) {
    request.startingOnOffense = game.startingOnOffense;
  }

  return request;
}

async function createGame(
  doFetch: typeof globalThis.fetch,
  apiUrl: string,
  body: {
    chatId: string;
    ourTeamName: string;
    opponentName: string;
    tournamentName: string;
    gameDate: string;
    gameOrder?: number;
  }
): Promise<string> {
  const res = await doFetch(`${apiUrl}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create game: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { game: { id: string } }).game.id;
}

async function addEvent(
  doFetch: typeof globalThis.fetch,
  apiUrl: string,
  gameId: string,
  event: AddEventRequest
): Promise<void> {
  const res = await doFetch(`${apiUrl}/games/${gameId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`Failed to add event: ${res.status} ${await res.text()}`);
}

async function deleteGame(
  doFetch: typeof globalThis.fetch,
  apiUrl: string,
  gameId: string
): Promise<void> {
  const res = await doFetch(`${apiUrl}/games/${gameId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete game ${gameId}: ${res.status} ${await res.text()}`);
  }
}

async function updateGame(
  doFetch: typeof globalThis.fetch,
  apiUrl: string,
  gameId: string,
  updates: { videoUrl?: string; startingOnOffense?: boolean }
): Promise<void> {
  const res = await doFetch(`${apiUrl}/games/${gameId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update game ${gameId}: ${res.status} ${await res.text()}`);
}

async function loadGame(
  spec: TournamentSpec,
  game: GameSpec,
  timeZone: string,
  apiUrl: string,
  doFetch: typeof globalThis.fetch,
  log: (message: string) => void
): Promise<string> {
  log(`\n=== ${game.ourTeam} vs ${game.opponent} (${game.date}) ===`);

  // Replace mode: delete the old game first (the reload/fix scripts delete then
  // re-create; the API has no in-place event replace). A fresh id is returned.
  if (game.existingGameId) {
    log(`Replacing existing game ${game.existingGameId} (deleting)...`);
    await deleteGame(doFetch, apiUrl, game.existingGameId);
  }

  const chatId = game.chatId ?? defaultChatId(spec, game);
  const gameId = await createGame(doFetch, apiUrl, {
    chatId,
    ourTeamName: game.ourTeam,
    opponentName: game.opponent,
    tournamentName: spec.tournament,
    gameDate: game.date,
    gameOrder: game.gameOrder,
  });
  log(`Created ${gameId}`);

  for (let i = 0; i < game.events.length; i++) {
    const event = game.events[i];
    log(`  [${i + 1}/${game.events.length}] ${event.type}${event.message ? ': ' + event.message : ''}`);
    await addEvent(doFetch, apiUrl, gameId, toAddEventRequest(event, game, timeZone));
  }

  if (game.videoUrl) {
    await updateGame(doFetch, apiUrl, gameId, { videoUrl: game.videoUrl });
    log(`Set videoUrl`);
  }

  log(`Done! ${game.events.length} events loaded.`);
  return gameId;
}

/**
 * Load an entire tournament. Returns the created game ids in spec order.
 */
export async function loadTournament(spec: TournamentSpec, opts: LoadOptions = {}): Promise<string[]> {
  const apiUrl = opts.apiUrl ?? API_URL;
  const doFetch = opts.fetch ?? globalThis.fetch;
  const log = opts.log ?? ((message: string) => console.log(message));
  const timeZone = spec.timezone ?? DEFAULT_TIMEZONE;

  log(`Loading "${spec.tournament}" — ${spec.games.length} game(s) → ${apiUrl}`);

  const gameIds: string[] = [];
  for (const game of spec.games) {
    gameIds.push(await loadGame(spec, game, timeZone, apiUrl, doFetch, log));
  }

  log(`\nAll done. ${gameIds.length} game(s) loaded.`);
  return gameIds;
}
