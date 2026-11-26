# Proposal: graduated economic sanctions and exemptions

> Status: design proposal only; does not modify live economy behavior.

## Design goal
Extend simple embargo behavior into graduated sanctions covering selected resources, ports, entities and time-limited exemptions.

## Gameplay loop
Players choose sanction scope, allies coordinate enforcement, and targets seek alternate routes or negotiate a reduction in restrictions.

## Economic invariants
The engine owns all resource and debt accounting. Use integer arithmetic, explicit caps and single-settlement execution IDs. A trade, tax, transfer or repayment must not be replayable for a second reward. The simulation must remain deterministic across clients and replays.

## Acceptance criteria
- Sanction scope is explicit; allies do not inherit hidden changes; exemptions expire deterministically; existing embargo intents retain their current behavior.
- Include property-style tests for conservation, caps, invalid owners and concurrent transfers.
- Include snapshot migration tests if new persistent fields are introduced.
- Show players a clear cost/benefit preview without exposing private opponent inventories.
- Keep new economic rules opt-in until their balance is validated in both small and large lobbies.

## Implementation boundaries
Future implementation belongs in the engine and shared update contracts, with a small client interface for policy selection. Review current donation, trade-ship, factory and embargo rules before integration; do not duplicate existing mechanics under a new label.

## Validation status
Documentation-only proposal; no code, migration or deployment is included.