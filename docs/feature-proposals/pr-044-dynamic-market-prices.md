# Proposal: dynamic resource market and regional pricing

> Status: design proposal only. The runtime economy is unchanged by this PR.

## Design goal
Introduce regional market prices driven by finite supply, demand, blockade pressure and trade volume with strict deterministic bounds.

## Player-facing loop
Players buy or sell at regional ports, exploit price differences and avoid saturating a market with repeated high-volume orders.

## Economy and determinism contract
All balances are settled in integer minor units or integer resource quantities. The engine validates affordability and ownership at execution time; the client never supplies an authoritative market price or production result. Any randomness must use the simulation's seeded deterministic source.

## Acceptance criteria
- Market updates are deterministic; trades settle atomically; prices have configured floors/ceilings; clients cannot submit stale prices as authority.
- Add tests for resource conservation, insufficient funds, ownership changes, maximum capacity and repeated submissions.
- Add snapshot/replay tests for inventories, timers, market state and production queues.
- Expose balance values through game configuration and document how they affect game duration.
- Provide a compatibility mode so current matches retain their existing gold economy.

## Implementation boundaries
The future change must update deterministic engine rules, engine-api update contracts, relevant client HUD panels and English/Persian localization. Review the current economy methods in [EngineConfig](../../packages/engine/src/configuration/EngineConfig.ts) before changing income or costs; avoid silently changing existing gold balance.

## Validation status
Proposal document only. No economy code or production settings are modified.