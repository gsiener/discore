/**
 * Environment bindings for Cloudflare Workers
 */

export interface Env {
  // Durable Object namespace
  GAME_STATE: DurableObjectNamespace;

  // D1 Database
  DB: D1Database;

  // Environment variables
  ENVIRONMENT: string;
}
