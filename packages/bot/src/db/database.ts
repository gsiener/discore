/**
 * Database service for persistent storage
 * Handles D1 database operations
 */

import { Game, GameEvent, GameSummary, TeamSide } from '@scorebot/shared';

export class DatabaseService {
  constructor(private db: D1Database) {}

  /**
   * Save game to database
   */
  async saveGame(game: Game): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO games (
          id, status, our_team_name, their_team_name,
          score_us, score_them, started_at, finished_at,
          chat_id, tournament_name, game_date, game_order,
          starting_on_offense, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        game.id,
        game.status,
        game.teams.us.name,
        game.teams.them.name,
        game.score.us,
        game.score.them,
        game.startedAt || null,
        game.finishedAt || null,
        game.chatId || null,
        game.tournamentName || null,
        game.gameDate || null,
        game.gameOrder || 0,
        game.startingOnOffense !== undefined ? (game.startingOnOffense ? 1 : 0) : null,
        game.createdAt,
        game.updatedAt
      )
      .run();

    // Save all events
    for (const event of game.events) {
      await this.saveEvent(event);
    }
  }

  /**
   * Save a single event to database
   */
  async saveEvent(event: GameEvent): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO events (
          id, game_id, type, timestamp, score_us, score_them,
          team, message, parsed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        event.id,
        event.gameId,
        event.type,
        event.timestamp,
        event.score.us,
        event.score.them,
        event.team || null,
        event.message || null,
        event.parsedBy || null
      )
      .run();
  }

  /**
   * Get game by ID
   */
  async getGame(gameId: string): Promise<Game | null> {
    const gameResult = await this.db
      .prepare('SELECT * FROM games WHERE id = ?')
      .bind(gameId)
      .first();

    if (!gameResult) return null;

    const eventsResult = await this.db
      .prepare('SELECT * FROM events WHERE game_id = ? ORDER BY timestamp ASC')
      .bind(gameId)
      .all();

    return this.mapToGame(gameResult, eventsResult.results || []);
  }

  /**
   * Get game by chat ID
   */
  async getGameByChatId(chatId: string): Promise<Game | null> {
    const gameResult = await this.db
      .prepare(
        'SELECT * FROM games WHERE chat_id = ? ORDER BY created_at DESC LIMIT 1'
      )
      .bind(chatId)
      .first();

    if (!gameResult) return null;

    const eventsResult = await this.db
      .prepare('SELECT * FROM events WHERE game_id = ? ORDER BY timestamp ASC')
      .bind(gameResult.id as string)
      .all();

    return this.mapToGame(gameResult, eventsResult.results || []);
  }

  /**
   * List all games, sorted by date (newest first), then by order within day
   */
  async listGames(limit: number = 50): Promise<GameSummary[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM games
        WHERE status = 'finished'
        ORDER BY
          COALESCE(game_date, DATE(finished_at / 1000, 'unixepoch')) DESC,
          game_order ASC,
          finished_at DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();

    return (result.results || []).map((row) => this.mapToGameSummary(row));
  }

  /**
   * Delete game and its events
   */
  async deleteGame(gameId: string): Promise<void> {
    await this.db.prepare('DELETE FROM games WHERE id = ?').bind(gameId).run();
    // Events will be cascade deleted due to foreign key constraint
  }

  /**
   * Map database row to Game object
   */
  private mapToGame(gameRow: any, eventRows: any[]): Game {
    return {
      id: gameRow.id,
      status: gameRow.status,
      teams: {
        us: { name: gameRow.our_team_name, side: TeamSide.US },
        them: { name: gameRow.their_team_name, side: TeamSide.THEM },
      },
      score: {
        us: gameRow.score_us,
        them: gameRow.score_them,
      },
      events: eventRows.map((row) => ({
        id: row.id,
        gameId: row.game_id,
        type: row.type,
        timestamp: row.timestamp,
        score: {
          us: row.score_us,
          them: row.score_them,
        },
        team: row.team,
        message: row.message,
        parsedBy: row.parsed_by,
      })),
      startedAt: gameRow.started_at,
      finishedAt: gameRow.finished_at,
      chatId: gameRow.chat_id,
      startingOnOffense: gameRow.starting_on_offense !== null ? gameRow.starting_on_offense === 1 : undefined,
      tournamentName: gameRow.tournament_name,
      gameDate: gameRow.game_date,
      gameOrder: gameRow.game_order,
      createdAt: gameRow.created_at,
      updatedAt: gameRow.updated_at,
    };
  }

  /**
   * Map database row to GameSummary object
   */
  private mapToGameSummary(row: any): GameSummary {
    return {
      id: row.id,
      status: row.status,
      teams: {
        us: { name: row.our_team_name, side: TeamSide.US },
        them: { name: row.their_team_name, side: TeamSide.THEM },
      },
      score: {
        us: row.score_us,
        them: row.score_them,
      },
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      startingOnOffense: row.starting_on_offense !== null ? row.starting_on_offense === 1 : undefined,
      tournamentName: row.tournament_name,
      gameDate: row.game_date,
      gameOrder: row.game_order,
    };
  }
}
