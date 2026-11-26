# Proposal: naval minefields and countermeasure sweeps

> Status: design proposal only. This document does not change runtime gameplay or claim that the feature is implemented.

## Design goal
Add deployable sea mines, minefield ownership and clearance operations. Minefields use deterministic placement and bounded damage; minesweeper units reduce risk along a route.

## Gameplay loop
A player lays mines in navigable water, marks safe corridors, and sends a minesweeper to clear a path. Friendly ships receive route-risk previews while opponents receive no hidden mine coordinates.

## Deterministic engine contract
The authoritative rules belong in the deterministic simulation layer described in [Game Architecture](../Architecture.md). The client may render previews and issue validated intents, but it must not decide outcomes. Any state that survives a tick boundary must be represented in the appropriate versioned snapshot schema.

## Multiplayer and visibility
Validate ownership, permissions, target eligibility and resource costs on the simulation side. Do not broadcast hidden enemy information to clients that are not entitled to see it. Replayed or duplicate intents must not create additional units, cargo, rewards or damage.

## Acceptance criteria
- Mines cannot spawn on land or inside ports; mine damage is resolved once; mine ownership changes are handled safely; hidden mine positions are not serialized to unauthorized client views.
- Add focused unit tests for valid, invalid, boundary and replayed-intent cases.
- Add snapshot round-trip tests for every persistent state field.
- Verify worker/client parity and ensure the feature remains disabled in legacy matches until the host opts in.
- Document balance constants and expose them through configuration rather than scattering literals through execution code.

## Implementation boundaries
This proposal is intentionally isolated from existing aircraft, warship, trade-ship and transport-ship behavior. A future implementation PR must include the engine contract, execution lifecycle, client presentation, localization, tests and migration strategy. Existing OpenFront-derived code and assets must retain their applicable attribution and licensing notices.

## Validation status
No runtime code was changed and no test result is claimed.