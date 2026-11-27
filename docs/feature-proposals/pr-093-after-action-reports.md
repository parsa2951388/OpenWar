# Proposal: detailed after-action reports and battle breakdowns

> Status: design proposal only; this PR does not add a campaign or replay runtime feature.

## Design goal
Generate a structured battle report showing economy, territory changes, unit losses, structure value, objectives and key turning points.

## Player-facing loop
At match end, players review a concise verdict, expand category breakdowns and export a shareable report for team review.

## Data integrity and compatibility
Any persistent progress or replay annotation must be tied to stable match identifiers and versioned schemas. Derived analytics must distinguish recorded facts from estimates. The server validates any saved or shared data, and the client must not be able to rewrite authoritative match results.

## Acceptance criteria
- Reports derive only from authoritative match/replay data; totals reconcile with engine statistics; private data is permission-filtered; old replays display only fields they contain.
- Test duplicate submissions, partial/incomplete records, old replay versions and reconnect behavior.
- Ensure large datasets are processed without blocking core gameplay or replay controls.
- Keep personal and private match data behind explicit visibility rules.
- Provide export size limits and graceful handling of unsupported schema versions.

## Implementation boundaries
A future implementation should reuse the existing replay, statistics and snapshot infrastructure where appropriate rather than duplicating game state. Separate server persistence, replay processing and client presentation; include localization and accessibility considerations.

## Validation status
Documentation-only proposal. No runtime campaign, replay, analytics or account behavior is changed.