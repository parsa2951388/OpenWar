# Proposal: national strategic reserves and emergency release

> Status: design proposal only; does not modify live economy behavior.

## Design goal
Add reserve stockpiles with storage limits and emergency release rules for fuel, food and ammunition.

## Gameplay loop
Players accumulate reserves, choose peacetime storage policy and release stock during a crisis at a controlled rate with an explicit opportunity cost.

## Economic invariants
The engine owns all resource and debt accounting. Use integer arithmetic, explicit caps and single-settlement execution IDs. A trade, tax, transfer or repayment must not be replayable for a second reward. The simulation must remain deterministic across clients and replays.

## Acceptance criteria
- Reserve transfer conserves resources; storage overflow is resolved by a documented policy; release cannot be repeated for the same tick; stockpiles persist across snapshots.
- Include property-style tests for conservation, caps, invalid owners and concurrent transfers.
- Include snapshot migration tests if new persistent fields are introduced.
- Show players a clear cost/benefit preview without exposing private opponent inventories.
- Keep new economic rules opt-in until their balance is validated in both small and large lobbies.

## Implementation boundaries
Future implementation belongs in the engine and shared update contracts, with a small client interface for policy selection. Review current donation, trade-ship, factory and embargo rules before integration; do not duplicate existing mechanics under a new label.

## Validation status
Documentation-only proposal; no code, migration or deployment is included.