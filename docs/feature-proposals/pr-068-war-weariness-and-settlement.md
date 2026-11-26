# Proposal: war weariness and negotiated conflict settlement

> Status: design proposal only; this PR does not alter the current alliance or diplomacy rules.

## Design goal
Add war-weariness pressure that rises from prolonged losses and creates a path to a negotiated armistice or settlement.

## Player-facing loop
Players weigh continued fighting against stability penalties, propose settlement terms and accept or reject a bounded agreement.

## Authority and fairness
Diplomatic agreements must be explicit engine state with a clear initiator, counterpart, start tick, expiry tick and permitted actions. The simulation must validate consent and permissions; client UI is not authoritative. Every economic or territorial consequence must settle atomically and remain replay-safe.

## Acceptance criteria
- Weariness cannot exceed defined caps; repeated declarations do not reset state; settlement transfers are atomic; legacy win conditions remain unchanged by default.
- Test invalid parties, simultaneous proposals, expiration boundaries, reconnects and repeated messages.
- Add snapshot migration and replay coverage for persistent agreements.
- Ensure all participants receive consistent public agreement state while private negotiation data remains private.
- Keep existing alliance and embargo behavior unchanged unless the lobby enables the new diplomacy system.

## Implementation boundaries
Future implementation must integrate with the existing alliance request/extension/break lifecycle rather than creating a parallel relationship model. Update UI, localization and event logs together; include explicit rules for bots and disconnected teammates.

## Validation status
Design document only. No existing treaty, alliance or embargo code is changed.