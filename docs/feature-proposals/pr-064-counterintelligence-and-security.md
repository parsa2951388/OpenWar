# Proposal: counterintelligence and facility security levels

> Status: design proposal only; no runtime intelligence feature is included here.

## Design goal
Give cities and strategic buildings configurable security levels that detect covert actions and reduce intelligence leakage.

## Gameplay loop
Players invest in security, assign patrol coverage and respond to suspicious activity; excessive security has a construction or upkeep cost.

## Privacy and simulation rules
Intelligence state is not equivalent to normal visible unit state. The engine must maintain a strict distinction between exact authoritative state and contact estimates. Only sanitized, permission-filtered contact data may be sent to clients. All timers, costs and outcomes must be deterministic and replayable.

## Acceptance criteria
- Security levels are capped; detection probabilities are deterministic; defensive state is owner-controlled; no hidden enemy operation details leak through public updates.
- Test expiration, ownership transfer, detection boundaries, simultaneous operations and duplicate intents.
- Verify that hidden entity coordinates and private operation targets are never serialized to unauthorized players.
- Add snapshot/replay tests for agent, contact, exposure and cooldown state.
- Provide counterplay and prevent indefinite invisible operations.

## Implementation boundaries
Future implementation must use explicit intent schemas and engine executions; the client may show confidence bands but cannot decide whether an operation succeeds. Keep new intelligence mechanics optional in lobby settings and compatible with legacy visibility rules.

## Validation status
Documentation-only proposal; no runtime behavior or security configuration is changed.