# Proposal: branching technology research tree

> Status: design proposal only; the research system is not implemented in this PR.

## Design goal
Add a multi-branch research tree for aviation, naval engineering, logistics, industry and defensive systems with mutually exclusive high-tier choices.

## Player-facing loop
Players allocate research points, unlock prerequisites and choose a specialization rather than acquiring every advantage in one match.

## Deterministic progression model
All research costs, prerequisites, progress and unlock outcomes must be computed by the core simulation. Use integer progress, explicit prerequisite graphs and deterministic tie-breaking. The client may display a technology tree, but it cannot authoritatively grant an unlock.

## Acceptance criteria
- Prerequisites are validated in the engine; research points cannot be duplicated; tier caps are enforced; selected unlocks survive snapshots and replays.
- Test missing prerequisites, invalid unlock IDs, simultaneous requests, caps and ownership changes.
- Add snapshot/replay tests for progress, selected branches and installed upgrades.
- Include migration behavior for matches created before the new fields exist.
- Keep progression optional per lobby and document balance effects on match length.

## Implementation boundaries
Future code must be split between engine rules, shared config/update schemas and client presentation. Research modifiers must be explicit configuration inputs and must not silently alter baseline engine configuration behavior in existing game modes.

## Validation status
This PR adds a technical proposal only. No runtime code or research balance is changed.