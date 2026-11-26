# Proposal: replay analytics and synchronized battle timeline overlays

> Status: design proposal only; this PR does not add a campaign or replay runtime feature.

## Design goal
Add timeline overlays for territory, economy, unit losses, air/naval activity and objective progress based on data already recorded or safely derivable.

## Player-facing loop
Viewers compare player curves, scrub to major swings and filter the timeline by battle system or player without slowing normal replay playback.

## Data integrity and compatibility
Any persistent progress or replay annotation must be tied to stable match identifiers and versioned schemas. Derived analytics must distinguish recorded facts from estimates. The server validates any saved or shared data, and the client must not be able to rewrite authoritative match results.

## Acceptance criteria
- Analytics never invent unavailable historical data; calculations are deterministic; large replays are processed off the main UI thread; missing event fields degrade gracefully.
- Test duplicate submissions, partial/incomplete records, old replay versions and reconnect behavior.
- Ensure large datasets are processed without blocking core gameplay or replay controls.
- Keep personal and private match data behind explicit visibility rules.
- Provide export size limits and graceful handling of unsupported schema versions.

## Implementation boundaries
A future implementation should reuse the existing replay, statistics and snapshot infrastructure where appropriate rather than duplicating game state. Separate server persistence, replay processing and client presentation; include localization and accessibility considerations.

## Validation status
Documentation-only proposal. No runtime campaign, replay, analytics or account behavior is changed.