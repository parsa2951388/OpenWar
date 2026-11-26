# Proposal: adaptive AI difficulty without hidden resource cheats

> Status: design proposal only. This PR adds no runtime AI or scenario behavior.

## Design goal
Tune bot decision quality and reaction speed from match context without granting unearned gold, troops or hidden map vision.

## Player-facing loop
The AI adjusts planning depth, risk tolerance and response cadence within documented limits as the match develops, while keeping its economy rule-compliant.

## Determinism, fairness and safety
All bot decisions and scenario outcomes must be resolved using deterministic engine inputs. Bot observations must obey the same visibility model as human players. Event definitions are data validated against a strict schema; arbitrary code execution, network calls and unbounded loops are out of scope.

## Acceptance criteria
- Difficulty changes do not alter resource grants; modifiers are capped; no player-specific hidden information leaks; the same replay reproduces each decision.
- Test deterministic tie-breaking, invalid configurations, reconnects and simultaneous objective updates.
- Add snapshot/replay coverage for all persistent bot or scenario state.
- Bound evaluation frequency and worst-case work for large matches.
- Preserve default match behavior when the optional system is disabled.

## Implementation boundaries
A future implementation must separate lobby configuration, engine decision rules, intent/execution state and client HUD presentation. Document tuning constants and provide focused unit tests before any feature is enabled on public matches.

## Validation status
Documentation-only proposal. No game code, bot behavior or production setting is changed.