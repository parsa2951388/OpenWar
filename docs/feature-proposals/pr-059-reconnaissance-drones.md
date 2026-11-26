# Proposal: reconnaissance drones and expendable sensors

> Status: design proposal only; no runtime intelligence feature is included here.

## Design goal
Add small unarmed UAVs that reveal terrain and transient unit contacts but cannot capture territory or deal combat damage.

## Gameplay loop
Players launch a drone from an eligible base, set a waypoint or patrol area, manage battery and recover it before enemy air defense destroys it.

## Privacy and simulation rules
Intelligence state is not equivalent to normal visible unit state. The engine must maintain a strict distinction between exact authoritative state and contact estimates. Only sanitized, permission-filtered contact data may be sent to clients. All timers, costs and outcomes must be deterministic and replayable.

## Acceptance criteria
- Drones cannot attack or capture; battery consumption is deterministic; hidden contacts decay; recovery requires a valid base; snapshots preserve mission state.
- Test expiration, ownership transfer, detection boundaries, simultaneous operations and duplicate intents.
- Verify that hidden entity coordinates and private operation targets are never serialized to unauthorized players.
- Add snapshot/replay tests for agent, contact, exposure and cooldown state.
- Provide counterplay and prevent indefinite invisible operations.

## Implementation boundaries
Future implementation must use explicit intent schemas and engine executions; the client may show confidence bands but cannot decide whether an operation succeeds. Keep new intelligence mechanics optional in lobby settings and compatible with legacy visibility rules.

## Validation status
Documentation-only proposal; no runtime behavior or security configuration is changed.