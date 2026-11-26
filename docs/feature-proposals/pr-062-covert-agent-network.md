# Proposal: covert agents and persistent intelligence networks

> Status: design proposal only; no runtime intelligence feature is included here.

## Design goal
Add a limited intelligence-agent network for gathering regional information with exposure, loyalty and maintenance costs.

## Gameplay loop
Players recruit agents, assign a low-profile mission, receive partial intelligence and periodically choose to rotate, extract or risk exposure.

## Privacy and simulation rules
Intelligence state is not equivalent to normal visible unit state. The engine must maintain a strict distinction between exact authoritative state and contact estimates. Only sanitized, permission-filtered contact data may be sent to clients. All timers, costs and outcomes must be deterministic and replayable.

## Acceptance criteria
- Agent ownership is private; mission progress is deterministic; exposed agents cannot continue covert actions; transfers and snapshots preserve identity securely.
- Test expiration, ownership transfer, detection boundaries, simultaneous operations and duplicate intents.
- Verify that hidden entity coordinates and private operation targets are never serialized to unauthorized players.
- Add snapshot/replay tests for agent, contact, exposure and cooldown state.
- Provide counterplay and prevent indefinite invisible operations.

## Implementation boundaries
Future implementation must use explicit intent schemas and engine executions; the client may show confidence bands but cannot decide whether an operation succeeds. Keep new intelligence mechanics optional in lobby settings and compatible with legacy visibility rules.

## Validation status
Documentation-only proposal; no runtime behavior or security configuration is changed.