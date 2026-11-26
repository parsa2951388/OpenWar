# Proposal: electronic-warfare jamming and radar degradation

> Status: design proposal only; no runtime intelligence feature is included here.

## Design goal
Add jamming units that degrade radar confidence, disrupt guided weapon acquisition and create a visible emission signature.

## Gameplay loop
Players position jammers near a front, select a bounded emission mode and accept increased detectability in exchange for reduced enemy sensor quality.

## Privacy and simulation rules
Intelligence state is not equivalent to normal visible unit state. The engine must maintain a strict distinction between exact authoritative state and contact estimates. Only sanitized, permission-filtered contact data may be sent to clients. All timers, costs and outcomes must be deterministic and replayable.

## Acceptance criteria
- Jamming effects have hard caps; emission zones are deterministic; friendly sensors are affected only by explicit policy; hidden information is never sent to unauthorized clients.
- Test expiration, ownership transfer, detection boundaries, simultaneous operations and duplicate intents.
- Verify that hidden entity coordinates and private operation targets are never serialized to unauthorized players.
- Add snapshot/replay tests for agent, contact, exposure and cooldown state.
- Provide counterplay and prevent indefinite invisible operations.

## Implementation boundaries
Future implementation must use explicit intent schemas and engine executions; the client may show confidence bands but cannot decide whether an operation succeeds. Keep new intelligence mechanics optional in lobby settings and compatible with legacy visibility rules.

## Validation status
Documentation-only proposal; no runtime behavior or security configuration is changed.