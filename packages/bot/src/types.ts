/**
 * Environment bindings for Cloudflare Workers
 */

import type { GameState } from './durable-objects/GameState';

export interface Env {
  // Durable Object namespace (typed for RPC against GameState)
  GAME_STATE: DurableObjectNamespace<GameState>;

  // D1 Database
  DB: D1Database;

  // Environment variables
  ENVIRONMENT: string;
}
