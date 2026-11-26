# Proposal: submarines, sonar contacts and detection decay

> Status: design proposal only. This document does not change runtime gameplay or claim that the feature is implemented.

## Design goal
Add a stealth submarine role with submerged/surfaced states, passive sonar, active sonar pulses and contact-confidence decay. Detection produces approximate contacts rather than revealing exact unit positions.

## Gameplay loop
Submarines conserve battery while submerged, surface for faster travel or recharge, and can be exposed by active sonar or nearby escorts. Repeated sonar scans increase confidence but reveal the scanning fleet's presence.

## Deterministic engine contract
The authoritative rules belong in the deterministic simulation layer described in [Game Architecture](../Architecture.md). The client may render previews and issue validated intents, but it must not decide outcomes. Any state that survives a tick boundary must be represented in the appropriate versioned snapshot schema.

## Multiplayer and visibility
Validate ownership, permissions, target eligibility and resource costs on the simulation side. Do not broadcast hidden enemy information to clients that are not entitled to see it. Replayed or duplicate intents must not create additional units, cargo, rewards or damage.

## Acceptance criteria
- No exact hidden position leaks through client updates; confidence decays identically on every client; sonar range respects map boundaries; submerged state persists across save/restore.
- Add focused unit tests for valid, invalid, boundary and replayed-intent cases.
- Add snapshot round-trip tests for every persistent state field.
- Verify worker/client parity and ensure the feature remains disabled in legacy matches until the host opts in.
- Document balance constants and expose them through configuration rather than scattering literals through execution code.

## Implementation boundaries
This proposal is intentionally isolated from existing aircraft, warship, trade-ship and transport-ship behavior. A future implementation PR must include the engine contract, execution lifecycle, client presentation, localization, tests and migration strategy. Existing OpenFront-derived code and assets must retain their applicable attribution and licensing notices.

## Validation status
No runtime code was changed and no test result is claimed.