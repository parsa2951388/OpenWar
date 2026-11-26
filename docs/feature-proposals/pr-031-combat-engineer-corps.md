# Proposal: combat engineers and field construction

> Status: design proposal only; this PR does not implement or enable the system.

## Design goal
Add engineer squads that build temporary bridges, repair infrastructure, clear obstacles and accelerate friendly fortification work.

## Player-facing loop
Engineers spend work points and local supplies on a selected project, remain vulnerable while working, and can be interrupted by combat or movement orders.

## Deterministic simulation requirements
All combat, movement, costs and project progress must be resolved by the core simulation from validated intents. Use explicit configuration for balance values and seeded randomness for any spread or uncertainty. Rendering may preview an action, but the engine remains authoritative.

## Acceptance criteria
- Only valid adjacent targets are accepted; material cost is atomic; interrupted work cannot be claimed twice; project progress is snapshot-safe.
- Add tests for edge-of-map, invalid ownership, repeated intents and simultaneous combat.
- Add snapshot/replay coverage for all persistent state.
- Verify parity between worker simulation and test harness.
- Keep the feature opt-in until compatibility and balance checks are complete.

## Integration and compatibility
See [Game Architecture](../Architecture.md). Future implementation must define intent schemas, execution registration, update payloads, client HUD/controls and localization together. Existing troop, artillery-adjacent and defense-post behavior must remain unchanged when the feature is disabled.

## Validation status
Documentation-only proposal. No runtime tests or production behavior are claimed.