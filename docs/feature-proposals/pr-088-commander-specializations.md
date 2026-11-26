# Proposal: commander roles and match-level specializations

> Status: design proposal only. This PR adds no runtime AI or scenario behavior.

## Design goal
Introduce opt-in commander roles that emphasize logistics, reconnaissance, air operations, naval power or fortification with side-grade bonuses.

## Player-facing loop
Players choose a role before a match, unlock role-specific planning options and remain constrained by a shared point budget to preserve competitive fairness.

## Determinism, fairness and safety
All bot decisions and scenario outcomes must be resolved using deterministic engine inputs. Bot observations must obey the same visibility model as human players. Event definitions are data validated against a strict schema; arbitrary code execution, network calls and unbounded loops are out of scope.

## Acceptance criteria
- Only one valid role is active per player; effects are bounded and non-stacking; roles are visible in lobby rules; legacy matches retain baseline behavior.
- Test deterministic tie-breaking, invalid configurations, reconnects and simultaneous objective updates.
- Add snapshot/replay coverage for all persistent bot or scenario state.
- Bound evaluation frequency and worst-case work for large matches.
- Preserve default match behavior when the optional system is disabled.

## Implementation boundaries
A future implementation must separate lobby configuration, engine decision rules, intent/execution state and client HUD presentation. Document tuning constants and provide focused unit tests before any feature is enabled on public matches.

## Validation status
Documentation-only proposal. No game code, bot behavior or production setting is changed.