# Proposal: player career statistics and skill history

> Status: design proposal only; this PR does not add a campaign or replay runtime feature.

## Design goal
Track opt-in career summaries such as match count, chosen roles, objective performance and win/loss history without granting combat power.

## Player-facing loop
Players review a career page, compare personal trends and inspect recent match summaries while keeping individual matches independently playable.

## Data integrity and compatibility
Any persistent progress or replay annotation must be tied to stable match identifiers and versioned schemas. Derived analytics must distinguish recorded facts from estimates. The server validates any saved or shared data, and the client must not be able to rewrite authoritative match results.

## Acceptance criteria
- Career updates are idempotent; reconnects cannot double-count a match; personal data has clear visibility controls; existing game simulation is unaffected.
- Test duplicate submissions, partial/incomplete records, old replay versions and reconnect behavior.
- Ensure large datasets are processed without blocking core gameplay or replay controls.
- Keep personal and private match data behind explicit visibility rules.
- Provide export size limits and graceful handling of unsupported schema versions.

## Implementation boundaries
A future implementation should reuse the existing replay, statistics and snapshot infrastructure where appropriate rather than duplicating game state. Separate server persistence, replay processing and client presentation; include localization and accessibility considerations.

## Validation status
Documentation-only proposal. No runtime campaign, replay, analytics or account behavior is changed.