# Proposal: protectorates, autonomy and client-state agreements

> Status: design proposal only; this PR does not alter the current alliance or diplomacy rules.

## Design goal
Model limited protectorate relationships with tribute, defense obligations and local autonomy instead of full territory annexation.

## Player-facing loop
A player offers protection terms, the smaller state accepts or rejects, and both sides manage obligations and an exit path over time.

## Authority and fairness
Diplomatic agreements must be explicit engine state with a clear initiator, counterpart, start tick, expiry tick and permitted actions. The simulation must validate consent and permissions; client UI is not authoritative. Every economic or territorial consequence must settle atomically and remain replay-safe.

## Acceptance criteria
- Control and ownership remain distinct; tribute is paid once per interval; autonomy bounds are enforced; breaking an agreement restores correct permissions.
- Test invalid parties, simultaneous proposals, expiration boundaries, reconnects and repeated messages.
- Add snapshot migration and replay coverage for persistent agreements.
- Ensure all participants receive consistent public agreement state while private negotiation data remains private.
- Keep existing alliance and embargo behavior unchanged unless the lobby enables the new diplomacy system.

## Implementation boundaries
Future implementation must integrate with the existing alliance request/extension/break lifecycle rather than creating a parallel relationship model. Update UI, localization and event logs together; include explicit rules for bots and disconnected teammates.

## Validation status
Design document only. No existing treaty, alliance or embargo code is changed.