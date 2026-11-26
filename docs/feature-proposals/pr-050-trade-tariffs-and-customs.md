# Proposal: trade tariffs and customs policy

> Status: design proposal only; does not modify live economy behavior.

## Design goal
Allow bilateral trade tariffs that modify convoy rewards, port access and treaty economics without creating free gold loops.

## Gameplay loop
Players negotiate tariffs, review trade flows and adjust rates to balance revenue against route volume and diplomatic friction.

## Economic invariants
The engine owns all resource and debt accounting. Use integer arithmetic, explicit caps and single-settlement execution IDs. A trade, tax, transfer or repayment must not be replayable for a second reward. The simulation must remain deterministic across clients and replays.

## Acceptance criteria
- Tariffs are applied symmetrically according to the contract; rates are bounded; a shipment is charged once; treaty cancellation does not retroactively alter settled trades.
- Include property-style tests for conservation, caps, invalid owners and concurrent transfers.
- Include snapshot migration tests if new persistent fields are introduced.
- Show players a clear cost/benefit preview without exposing private opponent inventories.
- Keep new economic rules opt-in until their balance is validated in both small and large lobbies.

## Implementation boundaries
Future implementation belongs in the engine and shared update contracts, with a small client interface for policy selection. Review current donation, trade-ship, factory and embargo rules before integration; do not duplicate existing mechanics under a new label.

## Validation status
Documentation-only proposal; no code, migration or deployment is included.