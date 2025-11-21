/**
 * Scorebot Cloudflare Worker
 * Main entry point for the API
 */

import { Env } from './types';
import { Router } from './api/router';
export { GameState } from './durable-objects/GameState';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const router = new Router(env);
    return router.handle(request);
  },
};
