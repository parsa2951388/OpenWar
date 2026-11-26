# Proposal: deterministic scenario event scripting

> Status: design proposal only. This PR adds no runtime AI or scenario behavior.

## Design goal
Provide a small declarative event model for scenario triggers, conditions, scheduled events and outcomes without allowing arbitrary executable code.

## Player-facing loop
Scenario authors compose events such as timed reinforcements, objective changes, ceasefires or disaster warnings using validated parameters.

## Determinism, fairness and safety
All bot decisions and scenario outcomes must be resolved using deterministic engine inputs. Bot observations must obey the same visibility model as human players. Event definitions are data validated against a strict schema; arbitrary code execution, network calls and unbounded loops are out of scope.

## Acceptance criteria
- Scripts are schema-validated and bounded; no eval or remote execution is permitted; events run in deterministic order; malformed scripts fail closed.
- Test deterministic tie-breaking, invalid configurations, reconnects and simultaneous objective updates.
- Add snapshot/replay coverage for all persistent bot or scenario state.
- Bound evaluation frequency and worst-case work for large matches.
- Preserve default match behavior when the optional system is disabled.

## Implementation boundaries
A future implementation must separate lobby configuration, engine decision rules, intent/execution state and client HUD presentation. Document tuning constants and provide focused unit tests before any feature is enabled on public matches.

## Validation status
Documentation-only proposal. No game code, bot behavior or production setting is changed.