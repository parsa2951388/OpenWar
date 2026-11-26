# Proposal: city taxation and civil stability

> Status: design proposal only. The runtime economy is unchanged by this PR.

## Design goal
Add a city-level tax policy with a trade-off between income, unrest and long-term productivity.

## Player-facing loop
Players set tax bands for controlled cities, monitor stability and lower taxes or invest in services to prevent unrest from reducing output.

## Economy and determinism contract
All balances are settled in integer minor units or integer resource quantities. The engine validates affordability and ownership at execution time; the client never supplies an authoritative market price or production result. Any randomness must use the simulation's seeded deterministic source.

## Acceptance criteria
- Tax is applied once per defined interval; stability is bounded; city ownership changes reset only documented modifiers; no negative or duplicated income is possible.
- Add tests for resource conservation, insufficient funds, ownership changes, maximum capacity and repeated submissions.
- Add snapshot/replay tests for inventories, timers, market state and production queues.
- Expose balance values through game configuration and document how they affect game duration.
- Provide a compatibility mode so current matches retain their existing gold economy.

## Implementation boundaries
The future change must update deterministic engine rules, engine-api update contracts, relevant client HUD panels and English/Persian localization. Review the current economy methods in [EngineConfig](../../packages/engine/src/configuration/EngineConfig.ts) before changing income or costs; avoid silently changing existing gold balance.

## Validation status
Proposal document only. No economy code or production settings are modified.