# Proposal: city and factory industrial specialization

> Status: design proposal only. The runtime economy is unchanged by this PR.

## Design goal
Allow controlled cities and factories to specialize in manufacturing, research, shipbuilding, logistics or energy with mutually exclusive bonuses.

## Player-facing loop
Players choose a specialization, pay an upgrade cost and shape regional production; changing specialization incurs downtime so choices matter.

## Economy and determinism contract
All balances are settled in integer minor units or integer resource quantities. The engine validates affordability and ownership at execution time; the client never supplies an authoritative market price or production result. Any randomness must use the simulation's seeded deterministic source.

## Acceptance criteria
- Only valid structures can specialize; bonuses do not stack beyond caps; upgrade cost is deducted once; specialization persists through capture and restore rules.
- Add tests for resource conservation, insufficient funds, ownership changes, maximum capacity and repeated submissions.
- Add snapshot/replay tests for inventories, timers, market state and production queues.
- Expose balance values through game configuration and document how they affect game duration.
- Provide a compatibility mode so current matches retain their existing gold economy.

## Implementation boundaries
The future change must update deterministic engine rules, engine-api update contracts, relevant client HUD panels and English/Persian localization. Review the current economy methods in [EngineConfig](../../packages/engine/src/configuration/EngineConfig.ts) before changing income or costs; avoid silently changing existing gold balance.

## Validation status
Proposal document only. No economy code or production settings are modified.