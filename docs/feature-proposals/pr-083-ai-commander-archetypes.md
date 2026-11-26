# Proposal: AI commander archetypes and strategic behavior

> Status: design proposal only. This PR adds no runtime AI or scenario behavior.

## Design goal
Give bots distinct strategic personalities such as expansionist, defensive, naval, industrial and opportunistic, each expressed through explicit configurable weights rather than brittle scripts.

## Player-facing loop
Players face opponents that choose different openings, expansion priorities and response patterns; scenario authors can select archetypes for a desired challenge.

## Determinism, fairness and safety
All bot decisions and scenario outcomes must be resolved using deterministic engine inputs. Bot observations must obey the same visibility model as human players. Event definitions are data validated against a strict schema; arbitrary code execution, network calls and unbounded loops are out of scope.

## Acceptance criteria
- Archetype decisions are deterministic for a fixed seed; all weights are bounded; no archetype receives hidden information unavailable to a human; save/restore preserves its strategic state.
- Test deterministic tie-breaking, invalid configurations, reconnects and simultaneous objective updates.
- Add snapshot/replay coverage for all persistent bot or scenario state.
- Bound evaluation frequency and worst-case work for large matches.
- Preserve default match behavior when the optional system is disabled.

## Implementation boundaries
A future implementation must separate lobby configuration, engine decision rules, intent/execution state and client HUD presentation. Document tuning constants and provide focused unit tests before any feature is enabled on public matches.

## Validation status
Documentation-only proposal. No game code, bot behavior or production setting is changed.