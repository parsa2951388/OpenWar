# Proposal: trade convoys, escort contracts and route risk

> Status: design proposal only. This document does not change runtime gameplay or claim that the feature is implemented.

## Design goal
Create multi-ship trade convoys that combine merchant vessels and escorts. Route income depends on distance, delivery integrity and risk exposure rather than a single ship reward.

## Gameplay loop
Players assign a route, select cargo capacity and attach escorts. Convoys periodically advance, can be intercepted, and settle rewards only when cargo reaches a valid destination.

## Deterministic engine contract
The authoritative rules belong in the deterministic simulation layer described in [Game Architecture](../Architecture.md). The client may render previews and issue validated intents, but it must not decide outcomes. Any state that survives a tick boundary must be represented in the appropriate versioned snapshot schema.

## Multiplayer and visibility
Validate ownership, permissions, target eligibility and resource costs on the simulation side. Do not broadcast hidden enemy information to clients that are not entitled to see it. Replayed or duplicate intents must not create additional units, cargo, rewards or damage.

## Acceptance criteria
- Cargo and gold cannot be duplicated by replayed execution; route ownership is revalidated each tick; escort losses update convoy protection; rewards are snapshot-safe.
- Add focused unit tests for valid, invalid, boundary and replayed-intent cases.
- Add snapshot round-trip tests for every persistent state field.
- Verify worker/client parity and ensure the feature remains disabled in legacy matches until the host opts in.
- Document balance constants and expose them through configuration rather than scattering literals through execution code.

## Implementation boundaries
This proposal is intentionally isolated from existing aircraft, warship, trade-ship and transport-ship behavior. A future implementation PR must include the engine contract, execution lifecycle, client presentation, localization, tests and migration strategy. Existing OpenFront-derived code and assets must retain their applicable attribution and licensing notices.

## Validation status
No runtime code was changed and no test result is claimed.