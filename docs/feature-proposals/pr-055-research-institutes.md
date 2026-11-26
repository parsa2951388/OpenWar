# Proposal: research institutes and regional science output

> Status: design proposal only; the research system is not implemented in this PR.

## Design goal
Add research institute buildings that generate science from connected cities and industry, subject to capacity and disruption.

## Player-facing loop
Players invest in institutes, protect them from raids and choose between short-term military production and long-term technology growth.

## Deterministic progression model
All research costs, prerequisites, progress and unlock outcomes must be computed by the core simulation. Use integer progress, explicit prerequisite graphs and deterministic tie-breaking. The client may display a technology tree, but it cannot authoritatively grant an unlock.

## Acceptance criteria
- Science accounting is integer-based; captured institutes transfer ownership once; production has hard caps; output is snapshot-safe.
- Test missing prerequisites, invalid unlock IDs, simultaneous requests, caps and ownership changes.
- Add snapshot/replay tests for progress, selected branches and installed upgrades.
- Include migration behavior for matches created before the new fields exist.
- Keep progression optional per lobby and document balance effects on match length.

## Implementation boundaries
Future code must be split between engine rules, shared config/update schemas and client presentation. Research modifiers must be explicit configuration inputs and must not silently alter baseline engine configuration behavior in existing game modes.

## Validation status
This PR adds a technical proposal only. No runtime code or research balance is changed.