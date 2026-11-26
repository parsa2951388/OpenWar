# Proposal: ceasefire zones and demilitarized corridors

> Status: design proposal only; this PR does not alter the current alliance or diplomacy rules.

## Design goal
Support ceasefires that define geographic zones and limited demilitarized corridors instead of blanket alliance states.

## Player-facing loop
Players draw a corridor, agree to a ceasefire window and use neutral routes for evacuation or trade while violations affect diplomatic standing.

## Authority and fairness
Diplomatic agreements must be explicit engine state with a clear initiator, counterpart, start tick, expiry tick and permitted actions. The simulation must validate consent and permissions; client UI is not authoritative. Every economic or territorial consequence must settle atomically and remain replay-safe.

## Acceptance criteria
- Zone geometry is validated and bounded; ceasefire effects are deterministic; attacks are still possible outside the zone; expired zones are removed cleanly.
- Test invalid parties, simultaneous proposals, expiration boundaries, reconnects and repeated messages.
- Add snapshot migration and replay coverage for persistent agreements.
- Ensure all participants receive consistent public agreement state while private negotiation data remains private.
- Keep existing alliance and embargo behavior unchanged unless the lobby enables the new diplomacy system.

## Implementation boundaries
Future implementation must integrate with the existing alliance request/extension/break lifecycle rather than creating a parallel relationship model. Update UI, localization and event logs together; include explicit rules for bots and disconnected teammates.

## Validation status
Design document only. No existing treaty, alliance or embargo code is changed.