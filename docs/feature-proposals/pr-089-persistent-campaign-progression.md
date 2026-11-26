# Proposal: persistent campaign progression across theatres

> Status: design proposal only; this PR does not add a campaign or replay runtime feature.

## Design goal
Add an opt-in campaign layer that links multiple battles through a theatre map, carry-over resources and controlled unlocks.

## Player-facing loop
Players complete linked operations, preserve selected campaign assets between battles and decide which fronts to reinforce before the next engagement.

## Data integrity and compatibility
Any persistent progress or replay annotation must be tied to stable match identifiers and versioned schemas. Derived analytics must distinguish recorded facts from estimates. The server validates any saved or shared data, and the client must not be able to rewrite authoritative match results.

## Acceptance criteria
- Campaign resources cannot be duplicated between missions; carry-over state is versioned; failed or abandoned missions have explicit outcomes; independent classic matches remain unchanged.
- Test duplicate submissions, partial/incomplete records, old replay versions and reconnect behavior.
- Ensure large datasets are processed without blocking core gameplay or replay controls.
- Keep personal and private match data behind explicit visibility rules.
- Provide export size limits and graceful handling of unsupported schema versions.

## Implementation boundaries
A future implementation should reuse the existing replay, statistics and snapshot infrastructure where appropriate rather than duplicating game state. Separate server persistence, replay processing and client presentation; include localization and accessibility considerations.

## Validation status
Documentation-only proposal. No runtime campaign, replay, analytics or account behavior is changed.