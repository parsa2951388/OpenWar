# Proposal: coastal anti-ship missile batteries

> Status: design proposal only; no runtime behavior is changed by this PR.

## Design goal
Add fixed coastal launchers that threaten hostile surface fleets within configured range and line-of-sight constraints.

## Player-facing loop
Players build a battery, load limited ammunition and select a sea corridor; opponents can suppress, evade or destroy the launcher.

## Simulation contract
Implement authoritative outcomes inside the deterministic engine. The client sends intents and renders confirmed state; it must not decide damage, production, movement or rewards. Keep all tunable values in configuration and make seeded randomness explicit.

## Acceptance criteria
- Only eligible water targets can be engaged; ammunition is consumed atomically; friendly fleets are excluded; targeting information respects fog of war.
- Cover valid, invalid, boundary and repeated-intent cases with focused regression tests.
- Add worker-parity and snapshot round-trip tests for persistent fields.
- Preserve the behavior of standard matches when the feature flag is disabled.
- Add English and Persian UI strings and document balance assumptions for any future implementation.

## Integration points
Follow [Game Architecture](../Architecture.md) and the existing execution/intent/snapshot lifecycle. Review ownership transitions, destroyed entities, disconnected players, replay compatibility and visibility filtering before implementation.

## Validation status
This PR adds only a proposal document. No game code, live service or production configuration changes.