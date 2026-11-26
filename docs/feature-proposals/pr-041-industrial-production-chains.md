# Proposal: industrial production chains and factory inputs

> Status: design proposal only. The runtime economy is unchanged by this PR.

## Design goal
Replace isolated factory income with optional production chains in which mines, refineries, factories and ports exchange finite inputs and outputs.

## Player-facing loop
Players build connected industry, allocate scarce inputs to selected outputs and protect bottlenecks; production pauses cleanly when an input or route is unavailable.

## Economy and determinism contract
All balances are settled in integer minor units or integer resource quantities. The engine validates affordability and ownership at execution time; the client never supplies an authoritative market price or production result. Any randomness must use the simulation's seeded deterministic source.

## Acceptance criteria
- Input/output accounting conserves resources; cycles cannot mint value; production order is deterministic; captured factories use the new owner's permissions; chain state survives snapshots.
- Add tests for resource conservation, insufficient funds, ownership changes, maximum capacity and repeated submissions.
- Add snapshot/replay tests for inventories, timers, market state and production queues.
- Expose balance values through game configuration and document how they affect game duration.
- Provide a compatibility mode so current matches retain their existing gold economy.

## Implementation boundaries
The future change must update deterministic engine rules, engine-api update contracts, relevant client HUD panels and English/Persian localization. Review the current economy methods in [EngineConfig](../../packages/engine/src/configuration/EngineConfig.ts) before changing income or costs; avoid silently changing existing gold balance.

## Validation status
Proposal document only. No economy code or production settings are modified.