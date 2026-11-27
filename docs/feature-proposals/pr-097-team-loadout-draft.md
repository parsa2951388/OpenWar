# Proposal: team loadout draft and pre-match planning phase

> Status: design proposal only; no ranked, tournament or lobby service behavior is implemented here.

## Design goal
Add a fair pre-match planning phase for selecting team doctrine, map-side preferences and optional rule modules under shared limits.

## Player-facing loop
Teams review the map, coordinate permitted loadouts, lock selections and receive a clear countdown before the match begins.

## Competitive integrity contract
Competitive outcomes must be calculated from authoritative match records and validated server-side. Define timeouts, disconnect handling, rematches, result disputes and tie-breakers before implementation. Keep hidden gameplay state private and separate account/ladder state from deterministic simulation.

## Acceptance criteria
- Draft timeouts resolve predictably; illegal combinations are rejected; all teams see the same public choices; draft state is snapshot-safe and cannot delay a match indefinitely.
- Test duplicate result submissions, conflicting reports, reconnects, timeouts and simultaneous tournament updates.
- Ensure competitive rules are public, versioned and auditable.
- Add abuse/rate-limit controls without disclosing private anti-cheat signals.
- Keep all competitive rewards cosmetic or otherwise non-pay-to-win.

## Implementation boundaries
Future work must separate matchmaking, account persistence, match simulation and client lobby UI. Reuse existing lobby and matchmaking contracts where possible; do not bypass production identity checks or expose development credentials. Provide clear moderation and appeal paths for organized competitions.

## Validation status
Documentation-only proposal. No ranked queue, tournament backend or live lobby setting is changed.