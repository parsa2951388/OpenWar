# Proposal: ocean weather routing and storm cells

> Status: design proposal only; no runtime behavior is changed by this PR.

## Design goal
Model deterministic storm regions that alter ship speed, route safety and visibility while preserving the existing pathfinder's bounds.

## Player-facing loop
Commanders compare a shorter dangerous route with a longer safe route; fleets can wait for a storm to pass or use weather forecasts.

## Simulation contract
Implement authoritative outcomes inside the deterministic engine. The client sends intents and renders confirmed state; it must not decide damage, production, movement or rewards. Keep all tunable values in configuration and make seeded randomness explicit.

## Acceptance criteria
- Storm movement is seeded and deterministic; route previews match simulation costs; storms never make land tiles navigable; legacy matches can disable the system.
- Cover valid, invalid, boundary and repeated-intent cases with focused regression tests.
- Add worker-parity and snapshot round-trip tests for persistent fields.
- Preserve the behavior of standard matches when the feature flag is disabled.
- Add English and Persian UI strings and document balance assumptions for any future implementation.

## Integration points
Follow [Game Architecture](../Architecture.md) and the existing execution/intent/snapshot lifecycle. Review ownership transitions, destroyed entities, disconnected players, replay compatibility and visibility filtering before implementation.

## Validation status
This PR adds only a proposal document. No game code, live service or production configuration changes.