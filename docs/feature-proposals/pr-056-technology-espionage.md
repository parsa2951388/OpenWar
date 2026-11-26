# Proposal: technology espionage and research intelligence

> Status: design proposal only; the research system is not implemented in this PR.

## Design goal
Allow intelligence units to estimate rival research progress and attempt bounded technology theft with detection risk.

## Player-facing loop
Players infiltrate a research region, gather partial intelligence over time and choose to steal, sabotage or withdraw before counterintelligence reacts.

## Deterministic progression model
All research costs, prerequisites, progress and unlock outcomes must be computed by the core simulation. Use integer progress, explicit prerequisite graphs and deterministic tie-breaking. The client may display a technology tree, but it cannot authoritatively grant an unlock.

## Acceptance criteria
- Exact hidden progress is never leaked; theft cannot grant a locked technology without prerequisites; detection is seeded; operation state restores deterministically.
- Test missing prerequisites, invalid unlock IDs, simultaneous requests, caps and ownership changes.
- Add snapshot/replay tests for progress, selected branches and installed upgrades.
- Include migration behavior for matches created before the new fields exist.
- Keep progression optional per lobby and document balance effects on match length.

## Implementation boundaries
Future code must be split between engine rules, shared config/update schemas and client presentation. Research modifiers must be explicit configuration inputs and must not silently alter baseline engine configuration behavior in existing game modes.

## Validation status
This PR adds a technical proposal only. No runtime code or research balance is changed.