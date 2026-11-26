# Proposal: field artillery batteries and fire missions

> Status: design proposal only; this PR does not implement or enable the system.

## Design goal
Add indirect-fire batteries with ammunition types, setup time, firing arcs, dispersion and counter-battery exposure.

## Player-facing loop
Players deploy a battery, assign a grid target, choose a fire mission and sustain or relocate the guns before enemy counter-fire arrives.

## Deterministic simulation requirements
All combat, movement, costs and project progress must be resolved by the core simulation from validated intents. Use explicit configuration for balance values and seeded randomness for any spread or uncertainty. Rendering may preview an action, but the engine remains authoritative.

## Acceptance criteria
- Indirect fire cannot target invalid map cells; dispersion is seeded; ammunition is deducted once; firing reveals a temporary origin signature; snapshots restore setup and cooldown.
- Add tests for edge-of-map, invalid ownership, repeated intents and simultaneous combat.
- Add snapshot/replay coverage for all persistent state.
- Verify parity between worker simulation and test harness.
- Keep the feature opt-in until compatibility and balance checks are complete.

## Integration and compatibility
See [Game Architecture](../Architecture.md). Future implementation must define intent schemas, execution registration, update payloads, client HUD/controls and localization together. Existing troop, artillery-adjacent and defense-post behavior must remain unchanged when the feature is disabled.

## Validation status
Documentation-only proposal. No runtime tests or production behavior are claimed.