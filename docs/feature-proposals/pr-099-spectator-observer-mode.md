# Proposal: spectator mode with delayed and fog-safe observation

> Status: design proposal only; no ranked, tournament or lobby service behavior is implemented here.

## Design goal
Introduce observer sessions with configurable delay and information filtering so spectators cannot leak live hidden positions or plans.

## Player-facing loop
Spectators follow a match, switch player perspectives when permitted and inspect public battle events while active players retain their normal visibility rules.

## Competitive integrity contract
Competitive outcomes must be calculated from authoritative match records and validated server-side. Define timeouts, disconnect handling, rematches, result disputes and tie-breakers before implementation. Keep hidden gameplay state private and separate account/ladder state from deterministic simulation.

## Acceptance criteria
- Spectator updates are delayed as configured; hidden state is never exposed before release; observer sessions cannot send game intents; access and capacity are bounded.
- Test duplicate result submissions, conflicting reports, reconnects, timeouts and simultaneous tournament updates.
- Ensure competitive rules are public, versioned and auditable.
- Add abuse/rate-limit controls without disclosing private anti-cheat signals.
- Keep all competitive rewards cosmetic or otherwise non-pay-to-win.

## Implementation boundaries
Future work must separate matchmaking, account persistence, match simulation and client lobby UI. Reuse existing lobby and matchmaking contracts where possible; do not bypass production identity checks or expose development credentials. Provide clear moderation and appeal paths for organized competitions.

## Validation status
Documentation-only proposal. No ranked queue, tournament backend or live lobby setting is changed.