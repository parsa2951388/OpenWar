# Proposal: non-aggression treaties and border protocols

> Status: design proposal only; this PR does not alter the current alliance or diplomacy rules.

## Design goal
Create time-limited non-aggression treaties with defined border rules, violation penalties and renewal windows.

## Player-facing loop
Players propose a treaty, negotiate duration and protected borders, then accept, reject or allow it to expire with visible consequences.

## Authority and fairness
Diplomatic agreements must be explicit engine state with a clear initiator, counterpart, start tick, expiry tick and permitted actions. The simulation must validate consent and permissions; client UI is not authoritative. Every economic or territorial consequence must settle atomically and remain replay-safe.

## Acceptance criteria
- Treaties require consent from both parties; expiration is tick-exact; unilateral withdrawal follows a documented cooldown; violations are attributed once and replay-safe.
- Test invalid parties, simultaneous proposals, expiration boundaries, reconnects and repeated messages.
- Add snapshot migration and replay coverage for persistent agreements.
- Ensure all participants receive consistent public agreement state while private negotiation data remains private.
- Keep existing alliance and embargo behavior unchanged unless the lobby enables the new diplomacy system.

## Implementation boundaries
Future implementation must integrate with the existing alliance request/extension/break lifecycle rather than creating a parallel relationship model. Update UI, localization and event logs together; include explicit rules for bots and disconnected teammates.

## Validation status
Design document only. No existing treaty, alliance or embargo code is changed.