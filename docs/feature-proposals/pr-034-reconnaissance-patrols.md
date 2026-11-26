# Proposal: reconnaissance patrols and temporary ground vision

> Status: design proposal only; this PR does not implement or enable the system.

## Design goal
Add light reconnaissance teams that expose a limited area for a short duration without granting permanent map visibility.

## Player-facing loop
Players send patrols through uncertain terrain, receive confidence-tagged contacts and decide whether to observe, withdraw or reveal their position by engaging.

## Deterministic simulation requirements
All combat, movement, costs and project progress must be resolved by the core simulation from validated intents. Use explicit configuration for balance values and seeded randomness for any spread or uncertainty. Rendering may preview an action, but the engine remains authoritative.

## Acceptance criteria
- Vision expires on schedule; hidden units remain hidden outside the reveal radius; patrol ownership is validated; contact data is not mistaken for exact unit state.
- Add tests for edge-of-map, invalid ownership, repeated intents and simultaneous combat.
- Add snapshot/replay coverage for all persistent state.
- Verify parity between worker simulation and test harness.
- Keep the feature opt-in until compatibility and balance checks are complete.

## Integration and compatibility
See [Game Architecture](../Architecture.md). Future implementation must define intent schemas, execution registration, update payloads, client HUD/controls and localization together. Existing troop, artillery-adjacent and defense-post behavior must remain unchanged when the feature is disabled.

## Validation status
Documentation-only proposal. No runtime tests or production behavior are claimed.