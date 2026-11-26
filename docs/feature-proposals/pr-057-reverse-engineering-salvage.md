# Proposal: battlefield salvage and reverse engineering

> Status: design proposal only; the research system is not implemented in this PR.

## Design goal
Convert recovered enemy equipment into limited research insight or repair materials, avoiding direct duplicate unit creation.

## Player-facing loop
Players secure a wreck site, hold it for a recovery duration and choose whether to salvage resources or analyze the technology.

## Deterministic progression model
All research costs, prerequisites, progress and unlock outcomes must be computed by the core simulation. Use integer progress, explicit prerequisite graphs and deterministic tie-breaking. The client may display a technology tree, but it cannot authoritatively grant an unlock.

## Acceptance criteria
- One wreck can be recovered only once; ownership changes are explicit; salvage is bounded by wreck value; replay cannot double-award research.
- Test missing prerequisites, invalid unlock IDs, simultaneous requests, caps and ownership changes.
- Add snapshot/replay tests for progress, selected branches and installed upgrades.
- Include migration behavior for matches created before the new fields exist.
- Keep progression optional per lobby and document balance effects on match length.

## Implementation boundaries
Future code must be split between engine rules, shared config/update schemas and client presentation. Research modifiers must be explicit configuration inputs and must not silently alter baseline engine configuration behavior in existing game modes.

## Validation status
This PR adds a technical proposal only. No runtime code or research balance is changed.