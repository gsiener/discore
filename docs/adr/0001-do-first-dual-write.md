# The Durable Object is authoritative; every write goes DO-first, then D1

Every game mutation is a dual-write: the GameState Durable Object holds live state, D1 holds the durable mirror and query index. We decided the DO is authoritative for a live game and all writes flow DO → D1, with D1 failures surfaced as errors rather than swallowed. The GameStore module is the only place this ordering lives; callers never coordinate the two stores themselves.

## Considered Options

- **D1-first with the DO as cache** — one always-authoritative store, but forfeits the DO's single-threaded per-game ordering and invariant enforcement, and would require invalidation plumbing.
- **Keep the historical split** — metadata updates used to write D1-first with a fire-and-forget DO update, while event writes went DO-first. Rejected: a failed fire-and-forget silently diverged the stores until eviction, and the ambiguity already produced a data-loss bug (`INSERT OR REPLACE` cascade-deleted a game's events; see the comment in `packages/bot/src/db/database.ts`).

## Consequences

On cold start (DO evicted) the store rehydrates the DO from D1, so D1 is briefly the seed — but never the write target of record. Any future write path added outside GameStore should be treated as a bug.
