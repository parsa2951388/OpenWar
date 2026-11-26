# Proposal: military doctrines and command philosophies

> Status: design proposal only; the research system is not implemented in this PR.

## Design goal
Introduce selectable doctrines that trade attack tempo, defensive readiness, logistics efficiency and intelligence reach with strict non-stacking limits.

## Player-facing loop
A player selects one doctrine per category at match setup, unlocks doctrine branches through objectives and may change only at documented intervals.

## Deterministic progression model
All research costs, prerequisites, progress and unlock outcomes must be computed by the core simulation. Use integer progress, explicit prerequisite graphs and deterministic tie-breaking. The client may display a technology tree, but it cannot authoritatively grant an unlock.

## Acceptance criteria
- Doctrine modifiers are deterministic and capped; invalid combinations are rejected; changing doctrine cannot reset cooldowns; default matches retain baseline values.
- Test missing prerequisites, invalid unlock IDs, simultaneous requests, caps and ownership changes.
- Add snapshot/replay tests for progress, selected branches and installed upgrades.
- Include migration behavior for matches created before the new fields exist.
- Keep progression optional per lobby and document balance effects on match length.

## Implementation boundaries
Future code must be split between engine rules, shared config/update schemas and client presentation. Research modifiers must be explicit configuration inputs and must not silently alter baseline engine configuration behavior in existing game modes.

## Validation status
This PR adds a technical proposal only. No runtime code or research balance is changed.