# Proposal: maritime search-and-rescue operations

> Status: design proposal only; no runtime behavior is changed by this PR.

## Design goal
Introduce rescue missions for disabled friendly or allied vessels with a bounded recovery timer and salvage outcome.

## Player-facing loop
A rescue vessel receives a distress marker, reaches the last known location, secures survivors or cargo, and returns to a friendly port.

## Simulation contract
Implement authoritative outcomes inside the deterministic engine. The client sends intents and renders confirmed state; it must not decide damage, production, movement or rewards. Keep all tunable values in configuration and make seeded randomness explicit.

## Acceptance criteria
- Rescue cannot duplicate cargo or units; stale distress signals expire; target ownership is revalidated; recovery progress restores correctly from snapshots.
- Cover valid, invalid, boundary and repeated-intent cases with focused regression tests.
- Add worker-parity and snapshot round-trip tests for persistent fields.
- Preserve the behavior of standard matches when the feature flag is disabled.
- Add English and Persian UI strings and document balance assumptions for any future implementation.

## Integration points
Follow [Game Architecture](../Architecture.md) and the existing execution/intent/snapshot lifecycle. Review ownership transitions, destroyed entities, disconnected players, replay compatibility and visibility filtering before implementation.

## Validation status
This PR adds only a proposal document. No game code, live service or production configuration changes.