# Proposal: strategic resources beyond gold

> Status: design proposal only. The runtime economy is unchanged by this PR.

## Design goal
Define a compact resource model for fuel, metal, ammunition and food while retaining gold as the universal construction currency for legacy modes.

## Player-facing loop
Players secure deposits and trade routes, stock resources at depots, and decide whether to invest in industry or spend reserves on active operations.

## Economy and determinism contract
All balances are settled in integer minor units or integer resource quantities. The engine validates affordability and ownership at execution time; the client never supplies an authoritative market price or production result. Any randomness must use the simulation's seeded deterministic source.

## Acceptance criteria
- Resource quantities are non-negative integers; conversion rates are configured and bounded; legacy matches remain gold-only; resource changes are replayable and snapshot-safe.
- Add tests for resource conservation, insufficient funds, ownership changes, maximum capacity and repeated submissions.
- Add snapshot/replay tests for inventories, timers, market state and production queues.
- Expose balance values through game configuration and document how they affect game duration.
- Provide a compatibility mode so current matches retain their existing gold economy.

## Implementation boundaries
The future change must update deterministic engine rules, engine-api update contracts, relevant client HUD panels and English/Persian localization. Review the current economy methods in [EngineConfig](../../packages/engine/src/configuration/EngineConfig.ts) before changing income or costs; avoid silently changing existing gold balance.

## Validation status
Proposal document only. No economy code or production settings are modified.