# Proposal: diplomatic influence and negotiation leverage

> Status: design proposal only; this PR does not alter the current alliance or diplomacy rules.

## Design goal
Add a non-combat influence resource earned through objectives, aid and treaty reliability and spent on proposals or mediation.

## Player-facing loop
Players invest influence to make proposals, request mediation or secure limited guarantees, while repeated bad-faith actions reduce leverage.

## Authority and fairness
Diplomatic agreements must be explicit engine state with a clear initiator, counterpart, start tick, expiry tick and permitted actions. The simulation must validate consent and permissions; client UI is not authoritative. Every economic or territorial consequence must settle atomically and remain replay-safe.

## Acceptance criteria
- Influence cannot be farmed through repeated no-op actions; balances use integer units; proposal outcomes are deterministic; hidden opponent influence is not exposed.
- Test invalid parties, simultaneous proposals, expiration boundaries, reconnects and repeated messages.
- Add snapshot migration and replay coverage for persistent agreements.
- Ensure all participants receive consistent public agreement state while private negotiation data remains private.
- Keep existing alliance and embargo behavior unchanged unless the lobby enables the new diplomacy system.

## Implementation boundaries
Future implementation must integrate with the existing alliance request/extension/break lifecycle rather than creating a parallel relationship model. Update UI, localization and event logs together; include explicit rules for bots and disconnected teammates.

## Validation status
Design document only. No existing treaty, alliance or embargo code is changed.