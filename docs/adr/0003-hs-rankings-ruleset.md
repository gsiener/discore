# HS rankings follow a versioned unofficial ruleset (HS_2025_V1)

The club/college algorithm reference (gist `hayes/efb82329577cd5d5fdf7043b39681298`, pinned 2026-09-01) does not define high-school policy: no game minimum, no season calendar spanning an academic year, no HSNI bid system, and no varsity/JV handling. Rather than scattering HS assumptions through the engine, all policy lives in a versioned `Ruleset` (`packages/rankings/src/rules.ts`), and every published snapshot records its `rulesetVersion`.

## Considered Options

- **Hard-code club values (10-game minimum, May anchor)** — simplest, but mislabels HS teams: most HS teams play 5–9 countable games and the season starts in fall. Rejected.
- **Mirror the legacy Python engine exactly (equal weights, 0.01 tolerance)** — preserves continuity but keeps the known gaps the issue asked to close (no date weighting, order-dependent blowouts). Rejected as the end state; kept as the migration baseline instead.
- **Versioned HS ruleset defaulting to legacy-compatible qualification** — keeps the 5-game + non-league display rule the site already uses, adopts the gist math (score/date weights, RMS 1e-5, largest-gap blowouts), and leaves series multipliers at 1.0 until HS policy exists. Adopted as `HS_2025_V1`, labeled "unofficial HS adaptation".

## Consequences

- Gist behaviors that are empirical model choices, not verified rules — two-sided blowout exclusion, win-probability scale 200, simulation score extrapolation — are documented as such in code and never presented as official.
- Changing HS policy means adding a new ruleset version (e.g. `HS_2026_V1`), never editing `HS_2025_V1` in place; snapshots stay reproducible.
- Forfeits are excluded from ratings with no point penalty (the gist's college penalty heuristic is deliberately not imported).
- Future work (deferred): web UI for matchup/what-if/tournament/bids tools, backtesting calibration, and any HSNI bid allocation once a real ruleset exists.
