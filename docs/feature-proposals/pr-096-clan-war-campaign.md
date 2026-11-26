# Proposal: structured clan-war campaigns and scoring

> Status: design proposal only; no ranked, tournament or lobby service behavior is implemented here.

## Design goal
Provide scheduled clan campaigns with match windows, map pools, scoring rules, participation limits and transparent tie-breakers.

## Player-facing loop
Clans register a roster, select eligible matches during a campaign window, and accumulate score from verified outcomes and objective performance.

## Competitive integrity contract
Competitive outcomes must be calculated from authoritative match records and validated server-side. Define timeouts, disconnect handling, rematches, result disputes and tie-breakers before implementation. Keep hidden gameplay state private and separate account/ladder state from deterministic simulation.

## Acceptance criteria
- A match is counted once; roster eligibility is frozen at a defined time; score and tie-breaks are deterministic; abandoned matches have an explicit adjudication rule.
- Test duplicate result submissions, conflicting reports, reconnects, timeouts and simultaneous tournament updates.
- Ensure competitive rules are public, versioned and auditable.
- Add abuse/rate-limit controls without disclosing private anti-cheat signals.
- Keep all competitive rewards cosmetic or otherwise non-pay-to-win.

## Implementation boundaries
Future work must separate matchmaking, account persistence, match simulation and client lobby UI. Reuse existing lobby and matchmaking contracts where possible; do not bypass production identity checks or expose development credentials. Provide clear moderation and appeal paths for organized competitions.

## Validation status
Documentation-only proposal. No ranked queue, tournament backend or live lobby setting is changed.