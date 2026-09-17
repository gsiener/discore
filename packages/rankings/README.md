# @scorebot/rankings

USAU-style iterative ratings, predictions, and scenario math. Unofficial high-school adaptation.

Reference: gist `hayes/efb82329577cd5d5fdf7043b39681298` (pinned 2026-09-01).
See issue #3 for the phased plan. Implementation status:

- [x] Canonical model (`model.ts`) + normalization/dedupe (`normalize.ts`)
- [x] Versioned rulesets: `HS_2025_V1`, `CLUB_2025` (`rules.ts`)
- [x] Core math: rankDiff, score/date weights, season weeks, win prob, score projection (`math.ts`)
- [x] Weighted iterative solver, per-iteration deterministic blowouts, components (`ratings.ts`)
- [x] Eligibility (`eligibility.ts`), SoS (`strength.ts`), uncertainty (`uncertainty.ts`)
- [x] Matchup preview (`predictions.ts`), what-if with re-anchoring (`scenarios.ts`)
- [x] Tournament templates/standings (`tournaments.ts`), bids + seeded Monte Carlo (`bids.ts`)
- [x] Alternate rules: Top-K post-hoc, configurable blowout (`alternate.ts`)
- [x] Dataset adapter + fingerprint (`adapter.ts`)
- [x] Strict dataset validation (`dataset.ts`), published snapshot builder (`snapshot.ts`)
- [x] Legacy export converter with mirror-dedupe + explicit aliases (`legacy.ts`)
- [x] Web rankings page (`packages/web/src/rankings.html`) rendering a snapshot
- [ ] Deferred UI: matchup/what-if, tournament sim, bids (library modules stay)

## Pipeline

```ts
import { parseCanonicalDataset, buildSnapshot, HS_2025_V1 } from '@scorebot/rankings';

const { dataset } = parseCanonicalDataset(canonicalJson); // throws on bad shape
const snapshot = buildSnapshot(dataset, HS_2025_V1); // ranks, SoS, confidence, explanations
```

- `npm run scale-check`: local-only migration check against the Drive exports
  (gitignored; never runs in CI). Current numbers: blowout overlap Jaccard ~0.91,
  top-25 overlap 24/25 boys and 21/25 girls, qualified-only Spearman 0.63/0.86.
  Remaining deltas are deliberate score/date weights plus deterministic
  largest-gap blowouts vs the legacy order-dependent selection.
- `npm run fixture-snapshot`: regenerate the committed web fixture snapshot.

## Policy notes (model choices, not verified official HS rules)

- Two-sided blowout exclusion (compatibility choice).
- HS default: 5 games + ≥1 non-league; JV excluded; forfeits excluded, no point penalty.
- HS season anchor: first Wednesday on/after Aug 1 of the fall year; configurable per ruleset.
- Series multipliers default 1.0 for HS until policy is agreed.
- Win probabilities are heuristic (scale 200); calibrate on held-out results before presenting as predictive.
- Scenario re-anchoring uses median shift of uninvolved teams; single global offset is insufficient when scenarios connect components — flagged via `connectedComponents`.
- Bid cutoffs for club/college follow the gist; HSNI invitations remain curated facts (no algorithmic allocation yet).

## Usage

```ts
import { HS_2025_V1, datasetToNormalized, runRatings, strengthOfSchedule } from '@scorebot/rankings';

const { games } = datasetToNormalized(dataset, HS_2025_V1);
const result = runRatings(games, HS_2025_V1);
```

`Effect` on contributions = gameRating − teamRating (explanatory, not causal).
