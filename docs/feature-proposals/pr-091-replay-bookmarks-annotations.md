# Proposal: replay bookmarks, annotations and event notes

> Status: design proposal only; this PR does not add a campaign or replay runtime feature.

## Design goal
Allow players to bookmark decisive replay moments, attach short annotations and share a compact timestamped review without modifying the source replay.

## Player-facing loop
A player pauses a replay, adds a bookmark such as first contact or capital capture, and returns directly to that moment later.

## Data integrity and compatibility
Any persistent progress or replay annotation must be tied to stable match identifiers and versioned schemas. Derived analytics must distinguish recorded facts from estimates. The server validates any saved or shared data, and the client must not be able to rewrite authoritative match results.

## Acceptance criteria
- Bookmarks use stable replay ticks; invalid timestamps are rejected; annotations do not mutate game state; import/export is bounded and compatible with replay versions.
- Test duplicate submissions, partial/incomplete records, old replay versions and reconnect behavior.
- Ensure large datasets are processed without blocking core gameplay or replay controls.
- Keep personal and private match data behind explicit visibility rules.
- Provide export size limits and graceful handling of unsupported schema versions.

## Implementation boundaries
A future implementation should reuse the existing replay, statistics and snapshot infrastructure where appropriate rather than duplicating game state. Separate server persistence, replay processing and client presentation; include localization and accessibility considerations.

## Validation status
Documentation-only proposal. No runtime campaign, replay, analytics or account behavior is changed.