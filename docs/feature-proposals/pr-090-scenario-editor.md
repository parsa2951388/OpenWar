# Proposal: in-game scenario editor and validation workspace

> Status: design proposal only; this PR does not add a campaign or replay runtime feature.

## Design goal
Create a safe scenario editor for configuring start positions, teams, objectives, bots, map constraints and scripted events using validated data.

## Player-facing loop
Creators build a scenario, run validation, preview spawns and objectives, then export a versioned scenario package for private or public lobbies.

## Data integrity and compatibility
Any persistent progress or replay annotation must be tied to stable match identifiers and versioned schemas. Derived analytics must distinguish recorded facts from estimates. The server validates any saved or shared data, and the client must not be able to rewrite authoritative match results.

## Acceptance criteria
- Editor output passes the same server-side schema validation; invalid starts and impossible objectives are reported; exports contain no executable code or secrets; schema versions migrate safely.
- Test duplicate submissions, partial/incomplete records, old replay versions and reconnect behavior.
- Ensure large datasets are processed without blocking core gameplay or replay controls.
- Keep personal and private match data behind explicit visibility rules.
- Provide export size limits and graceful handling of unsupported schema versions.

## Implementation boundaries
A future implementation should reuse the existing replay, statistics and snapshot infrastructure where appropriate rather than duplicating game state. Separate server persistence, replay processing and client presentation; include localization and accessibility considerations.

## Validation status
Documentation-only proposal. No runtime campaign, replay, analytics or account behavior is changed.