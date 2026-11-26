# Proposal: custom lobby rulesets and shareable match presets

> Status: design proposal only; no ranked, tournament or lobby service behavior is implemented here.

## Design goal
Allow hosts to compose validated optional systems into shareable presets with explicit compatibility checks and versioning.

## Player-facing loop
Hosts select map, teams, economy, environment and advanced systems, preview invalid combinations and share a preset code with friends.

## Competitive integrity contract
Competitive outcomes must be calculated from authoritative match records and validated server-side. Define timeouts, disconnect handling, rematches, result disputes and tie-breakers before implementation. Keep hidden gameplay state private and separate account/ladder state from deterministic simulation.

## Acceptance criteria
- Presets are schema-validated server-side; unsupported versions fail safely; rule combinations are deterministic; defaults reproduce current classic behavior.
- Test duplicate result submissions, conflicting reports, reconnects, timeouts and simultaneous tournament updates.
- Ensure competitive rules are public, versioned and auditable.
- Add abuse/rate-limit controls without disclosing private anti-cheat signals.
- Keep all competitive rewards cosmetic or otherwise non-pay-to-win.

## Implementation boundaries
Future work must separate matchmaking, account persistence, match simulation and client lobby UI. Reuse existing lobby and matchmaking contracts where possible; do not bypass production identity checks or expose development credentials. Provide clear moderation and appeal paths for organized competitions.

## Validation status
Documentation-only proposal. No ranked queue, tournament backend or live lobby setting is changed.