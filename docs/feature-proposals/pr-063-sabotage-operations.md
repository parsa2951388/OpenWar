# Proposal: sabotage operations against strategic infrastructure

> Status: design proposal only; no runtime intelligence feature is included here.

## Design goal
Allow covert units to delay a selected facility, damage a production queue or disrupt a supply link without directly changing map ownership.

## Gameplay loop
Players prepare an operation over time, choose a target, and either execute with a success chance or abort when counterintelligence detects the attempt.

## Privacy and simulation rules
Intelligence state is not equivalent to normal visible unit state. The engine must maintain a strict distinction between exact authoritative state and contact estimates. Only sanitized, permission-filtered contact data may be sent to clients. All timers, costs and outcomes must be deterministic and replayable.

## Acceptance criteria
- Sabotage has strict per-target cooldowns; production loss is bounded; repeated execution cannot stack damage; detection and outcomes use deterministic seeded rolls.
- Test expiration, ownership transfer, detection boundaries, simultaneous operations and duplicate intents.
- Verify that hidden entity coordinates and private operation targets are never serialized to unauthorized players.
- Add snapshot/replay tests for agent, contact, exposure and cooldown state.
- Provide counterplay and prevent indefinite invisible operations.

## Implementation boundaries
Future implementation must use explicit intent schemas and engine executions; the client may show confidence bands but cannot decide whether an operation succeeds. Keep new intelligence mechanics optional in lobby settings and compatible with legacy visibility rules.

## Validation status
Documentation-only proposal; no runtime behavior or security configuration is changed.