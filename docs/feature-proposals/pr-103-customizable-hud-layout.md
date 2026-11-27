# Proposal: customizable HUD panels and saved layouts

> Status: design proposal only; no client runtime UI is changed in this PR.

## Design goal
Allow players to resize, reposition, collapse and pin supported HUD panels with device-specific layout profiles.

## Player-facing loop
Players arrange the command panel, economy, selected units, minimap and event log, save a layout and restore it on another supported screen size.

## Interaction and accessibility contract
All critical actions must remain usable by touch, keyboard and assistive technology where applicable. Provide visible focus, clear labels, reversible actions and safe defaults. User preferences must be stored separately from authoritative match state; client controls issue validated intents rather than directly mutating the simulation.

## Acceptance criteria
- Layouts are validated against minimum/maximum bounds; reset always recovers a usable default; touch and keyboard users can operate every panel; preferences do not enter game snapshots.
- Test narrow and wide viewports, touch input, keyboard navigation, focus order and screen-reader labels.
- Verify localization expansion does not clip or hide critical actions.
- Ensure preferences migrate safely and can always be reset.
- Profile UI updates so customization does not increase per-frame work unnecessarily.

## Implementation boundaries
A future implementation must reuse the project's existing HUD, input and localization systems. Keep visual-only state in the client, preserve the map rendering performance budget and provide desktop/mobile acceptance evidence separately.

## Validation status
Documentation-only proposal. No client controls, settings or runtime behavior are modified.