# Proposal: carrier air-wing operations and deck cycles

> Status: design proposal only; no runtime behavior is changed by this PR.

## Design goal
Expand carriers into configurable air-wing bases with deck slots, launch/recovery cycles and carrier-specific readiness.

## Player-facing loop
Players allocate aircraft to deck groups, schedule launches, rotate recovering aircraft into service slots and reposition the carrier to extend operational reach.

## Simulation contract
Implement authoritative outcomes inside the deterministic engine. The client sends intents and renders confirmed state; it must not decide damage, production, movement or rewards. Keep all tunable values in configuration and make seeded randomness explicit.

## Acceptance criteria
- Deck capacity cannot be exceeded; takeoff and recovery slots cannot overlap; carrier movement invalidates stale landing plans; aircraft and carrier snapshots remain consistent.
- Cover valid, invalid, boundary and repeated-intent cases with focused regression tests.
- Add worker-parity and snapshot round-trip tests for persistent fields.
- Preserve the behavior of standard matches when the feature flag is disabled.
- Add English and Persian UI strings and document balance assumptions for any future implementation.

## Integration points
Follow [Game Architecture](../Architecture.md) and the existing execution/intent/snapshot lifecycle. Review ownership transitions, destroyed entities, disconnected players, replay compatibility and visibility filtering before implementation.

## Validation status
This PR adds only a proposal document. No game code, live service or production configuration changes.