# Proposal: armored vehicle platoons and armor facing

> Status: design proposal only; this PR does not implement or enable the system.

## Design goal
Introduce armored ground units with front, side and rear armor values, mobility classes and terrain-specific movement limits.

## Player-facing loop
Players group armor into platoons, use terrain for cover, flank defenders and choose between rapid movement and defensive posture.

## Deterministic simulation requirements
All combat, movement, costs and project progress must be resolved by the core simulation from validated intents. Use explicit configuration for balance values and seeded randomness for any spread or uncertainty. Rendering may preview an action, but the engine remains authoritative.

## Acceptance criteria
- Facing is derived deterministically from movement; armor values are bounded; invalid terrain blocks movement; unit state remains compatible with existing troop counts.
- Add tests for edge-of-map, invalid ownership, repeated intents and simultaneous combat.
- Add snapshot/replay coverage for all persistent state.
- Verify parity between worker simulation and test harness.
- Keep the feature opt-in until compatibility and balance checks are complete.

## Integration and compatibility
See [Game Architecture](../Architecture.md). Future implementation must define intent schemas, execution registration, update payloads, client HUD/controls and localization together. Existing troop, artillery-adjacent and defense-post behavior must remain unchanged when the feature is disabled.

## Validation status
Documentation-only proposal. No runtime tests or production behavior are claimed.