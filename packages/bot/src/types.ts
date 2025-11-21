/**
 * Environment bindings for Cloudflare Workers
 */

import { GameState } from './durable-objects/GameState';

export interface Env {
  // Durable Object namespace
  GAME_STATE: DurableObjectNamespace<GameState>;

  // D1 Database
  DB: D1Database;

  // Environment variables
  ENVIRONMENT: string;
}
