# Proposal: ranked seasons and transparent skill rating

> Status: design proposal only; no ranked, tournament or lobby service behavior is implemented here.

## Design goal
Design a seasonal competitive ladder with a documented rating model, placement matches, inactivity rules and protection against duplicate or manipulated results.

## Player-facing loop
Players complete ranked matches, receive a rating change with an explanation, track seasonal placement and compete for non-gameplay cosmetic rewards.

## Competitive integrity contract
Competitive outcomes must be calculated from authoritative match records and validated server-side. Define timeouts, disconnect handling, rematches, result disputes and tie-breakers before implementation. Keep hidden gameplay state private and separate account/ladder state from deterministic simulation.

## Acceptance criteria
- Rating updates are idempotent and server-authoritative; disconnects and rematches have explicit rules; smurf/abuse signals do not reveal private data; no gameplay advantage is purchased.
- Test duplicate result submissions, conflicting reports, reconnects, timeouts and simultaneous tournament updates.
- Ensure competitive rules are public, versioned and auditable.
- Add abuse/rate-limit controls without disclosing private anti-cheat signals.
- Keep all competitive rewards cosmetic or otherwise non-pay-to-win.

## Implementation boundaries
Future work must separate matchmaking, account persistence, match simulation and client lobby UI. Reuse existing lobby and matchmaking contracts where possible; do not bypass production identity checks or expose development credentials. Provide clear moderation and appeal paths for organized competitions.

## Validation status
Documentation-only proposal. No ranked queue, tournament backend or live lobby setting is changed.