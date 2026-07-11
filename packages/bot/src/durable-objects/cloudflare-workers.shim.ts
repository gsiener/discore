/**
 * Test-only shim for the `cloudflare:workers` virtual module.
 *
 * Vitest runs in Node, which cannot resolve the real Workers-runtime module,
 * so vitest.config.ts aliases `cloudflare:workers` to this file. It provides a
 * minimal `DurableObject` base whose constructor wires up `ctx`/`env` exactly
 * like the runtime does — which is all the unit tests exercise. TypeScript
 * itself resolves `cloudflare:workers` against @cloudflare/workers-types, not
 * this file, so production type-checking still uses the real declarations.
 */
export class DurableObject<Env = unknown> {
  protected ctx: any;
  protected env: Env;

  constructor(ctx: any, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
