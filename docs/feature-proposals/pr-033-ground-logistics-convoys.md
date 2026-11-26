# Proposal: ground logistics convoys and transport capacity

> Status: design proposal only; this PR does not implement or enable the system.

## Design goal
Model supply trucks that move ammunition and repair materials between depots, factories and front-line formations.

## Player-facing loop
A player assigns a convoy route, cargo mix and escort policy; interception can damage or capture the cargo before arrival.

## Deterministic simulation requirements
All combat, movement, costs and project progress must be resolved by the core simulation from validated intents. Use explicit configuration for balance values and seeded randomness for any spread or uncertainty. Rendering may preview an action, but the engine remains authoritative.

## Acceptance criteria
- Cargo remains conserved; route traversal is deterministic; captured convoys transfer ownership once; convoy state survives save/restore.
- Add tests for edge-of-map, invalid ownership, repeated intents and simultaneous combat.
- Add snapshot/replay coverage for all persistent state.
- Verify parity between worker simulation and test harness.
- Keep the feature opt-in until compatibility and balance checks are complete.

## Integration and compatibility
See [Game Architecture](../Architecture.md). Future implementation must define intent schemas, execution registration, update payloads, client HUD/controls and localization together. Existing troop, artillery-adjacent and defense-post behavior must remain unchanged when the feature is disabled.

## Validation status
Documentation-only proposal. No runtime tests or production behavior are claimed.