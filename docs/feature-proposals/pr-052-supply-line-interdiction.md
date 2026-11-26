# Proposal: supply-line networks and interdiction

> Status: design proposal only; does not modify live economy behavior.

## Design goal
Connect depots, factories and units through supply corridors whose capacity can be disrupted by hostile control, blockades or raids.

## Gameplay loop
Players maintain a front's supply route, create alternate corridors and target the opponent's chokepoints to reduce operational readiness.

## Economic invariants
The engine owns all resource and debt accounting. Use integer arithmetic, explicit caps and single-settlement execution IDs. A trade, tax, transfer or repayment must not be replayable for a second reward. The simulation must remain deterministic across clients and replays.

## Acceptance criteria
- Supply flow is deterministic and bounded by edge capacity; cycles do not duplicate cargo; destroyed links invalidate paths; supply state restores correctly.
- Include property-style tests for conservation, caps, invalid owners and concurrent transfers.
- Include snapshot migration tests if new persistent fields are introduced.
- Show players a clear cost/benefit preview without exposing private opponent inventories.
- Keep new economic rules opt-in until their balance is validated in both small and large lobbies.

## Implementation boundaries
Future implementation belongs in the engine and shared update contracts, with a small client interface for policy selection. Review current donation, trade-ship, factory and embargo rules before integration; do not duplicate existing mechanics under a new label.

## Validation status
Documentation-only proposal; no code, migration or deployment is included.