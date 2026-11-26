# Proposal: AI threat assessment and target prioritization

> Status: design proposal only. This PR adds no runtime AI or scenario behavior.

## Design goal
Build a threat model that weighs nearby forces, strategic structures, exposed borders, supply disruption and known air/naval contacts when bots select targets.

## Player-facing loop
Bots periodically reassess threats, defend vulnerable regions and choose between immediate tactical gains and strategic objectives.

## Determinism, fairness and safety
All bot decisions and scenario outcomes must be resolved using deterministic engine inputs. Bot observations must obey the same visibility model as human players. Event definitions are data validated against a strict schema; arbitrary code execution, network calls and unbounded loops are out of scope.

## Acceptance criteria
- Threat scores use only permitted observations; ties resolve deterministically; scoring work is bounded per tick; tests cover empty maps, disconnected fronts and simultaneous threats.
- Test deterministic tie-breaking, invalid configurations, reconnects and simultaneous objective updates.
- Add snapshot/replay coverage for all persistent bot or scenario state.
- Bound evaluation frequency and worst-case work for large matches.
- Preserve default match behavior when the optional system is disabled.

## Implementation boundaries
A future implementation must separate lobby configuration, engine decision rules, intent/execution state and client HUD presentation. Document tuning constants and provide focused unit tests before any feature is enabled on public matches.

## Validation status
Documentation-only proposal. No game code, bot behavior or production setting is changed.