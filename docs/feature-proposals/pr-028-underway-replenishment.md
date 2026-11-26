# Proposal: underway fleet replenishment and fuel tenders

> Status: design proposal only; no runtime behavior is changed by this PR.

## Design goal
Add logistics ships that transfer fuel, ammunition and repair supplies to eligible friendly vessels at sea.

## Player-facing loop
Players assign a tender to a fleet, select a transfer priority and protect the slow replenishment formation while supplies are delivered.

## Simulation contract
Implement authoritative outcomes inside the deterministic engine. The client sends intents and renders confirmed state; it must not decide damage, production, movement or rewards. Keep all tunable values in configuration and make seeded randomness explicit.

## Acceptance criteria
- Transfers are bounded by source stock and target capacity; destroyed tenders cannot deliver later; transfers are one-time executions; hidden stocks are not leaked.
- Cover valid, invalid, boundary and repeated-intent cases with focused regression tests.
- Add worker-parity and snapshot round-trip tests for persistent fields.
- Preserve the behavior of standard matches when the feature flag is disabled.
- Add English and Persian UI strings and document balance assumptions for any future implementation.

## Integration points
Follow [Game Architecture](../Architecture.md) and the existing execution/intent/snapshot lifecycle. Review ownership transitions, destroyed entities, disconnected players, replay compatibility and visibility filtering before implementation.

## Validation status
This PR adds only a proposal document. No game code, live service or production configuration changes.