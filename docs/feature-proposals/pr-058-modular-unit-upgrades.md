# Proposal: modular unit upgrades and equipment slots

> Status: design proposal only; the research system is not implemented in this PR.

## Design goal
Give selected unit classes configurable equipment slots for armor, sensors, propulsion, payload and support modules.

## Player-facing loop
Players unlock modules, install a legal loadout before deployment and trade speed, range, survivability or damage within a bounded budget.

## Deterministic progression model
All research costs, prerequisites, progress and unlock outcomes must be computed by the core simulation. Use integer progress, explicit prerequisite graphs and deterministic tie-breaking. The client may display a technology tree, but it cannot authoritatively grant an unlock.

## Acceptance criteria
- Slot compatibility is enforced; total loadout cost is capped; modules cannot be swapped in combat unless allowed; snapshots preserve module identity.
- Test missing prerequisites, invalid unlock IDs, simultaneous requests, caps and ownership changes.
- Add snapshot/replay tests for progress, selected branches and installed upgrades.
- Include migration behavior for matches created before the new fields exist.
- Keep progression optional per lobby and document balance effects on match length.

## Implementation boundaries
Future code must be split between engine rules, shared config/update schemas and client presentation. Research modifiers must be explicit configuration inputs and must not silently alter baseline engine configuration behavior in existing game modes.

## Validation status
This PR adds a technical proposal only. No runtime code or research balance is changed.