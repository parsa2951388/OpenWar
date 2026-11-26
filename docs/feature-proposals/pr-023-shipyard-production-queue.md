# Proposal: shipyard production queues and refit slots

> Status: design proposal only; no runtime behavior is changed by this PR.

## Design goal
Give ports and shipyards a finite construction queue, hull-specific build time, refit slots and cancellation refunds.

## Player-facing loop
Players queue vessels, prioritize a hull, pause production when resources are short, and refit damaged ships in a separate service slot.

## Simulation contract
Implement authoritative outcomes inside the deterministic engine. The client sends intents and renders confirmed state; it must not decide damage, production, movement or rewards. Keep all tunable values in configuration and make seeded randomness explicit.

## Acceptance criteria
- Queue order is deterministic; resource escrow is refunded exactly once; capture transfers or cancels queued work according to an explicit rule; queue state survives snapshots.
- Cover valid, invalid, boundary and repeated-intent cases with focused regression tests.
- Add worker-parity and snapshot round-trip tests for persistent fields.
- Preserve the behavior of standard matches when the feature flag is disabled.
- Add English and Persian UI strings and document balance assumptions for any future implementation.

## Integration points
Follow [Game Architecture](../Architecture.md) and the existing execution/intent/snapshot lifecycle. Review ownership transitions, destroyed entities, disconnected players, replay compatibility and visibility filtering before implementation.

## Validation status
This PR adds only a proposal document. No game code, live service or production configuration changes.