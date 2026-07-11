# GameState is called via Durable Object RPC, not fetch routing

GameState originally exposed a hand-written `fetch()` switch over ~10 magic paths because pre-2024 Workers runtimes required an HTTP boundary for DOs. We decided to bump `compatibility_date` (from 2024-01-01 to a current date, ≥ 2024-04-03) and expose typed RPC methods instead, deleting the path switch and all request/response JSON marshalling in callers and tests.

## Consequences

The compatibility-date bump flips other runtime defaults accumulated since 2024-01-01; the deploy needs a smoke test of game creation, event add/undo, and the stats endpoints, with rollback being a redeploy of the previous compat date. Tests call DO methods directly instead of constructing 104 `new Request(...)` objects.
