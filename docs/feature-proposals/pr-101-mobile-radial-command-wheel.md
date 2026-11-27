# Proposal: mobile radial command wheel and contextual actions

> Status: design proposal only; no client runtime UI is changed in this PR.

## Design goal
Design a touch-first radial command wheel for issuing attack, defend, patrol, build, diplomacy and aircraft orders without relying on hover or keyboard shortcuts.

## Player-facing loop
Players select one or more units, open a contextual wheel, preview a command and confirm or cancel with a single touch gesture.

## Interaction and accessibility contract
All critical actions must remain usable by touch, keyboard and assistive technology where applicable. Provide visible focus, clear labels, reversible actions and safe defaults. User preferences must be stored separately from authoritative match state; client controls issue validated intents rather than directly mutating the simulation.

## Acceptance criteria
- All actions remain reachable on narrow screens; touch targets meet documented minimum sizes; wheel placement avoids screen edges; cancel and back gestures never issue accidental commands.
- Test narrow and wide viewports, touch input, keyboard navigation, focus order and screen-reader labels.
- Verify localization expansion does not clip or hide critical actions.
- Ensure preferences migrate safely and can always be reset.
- Profile UI updates so customization does not increase per-frame work unnecessarily.

## Implementation boundaries
A future implementation must reuse the project's existing HUD, input and localization systems. Keep visual-only state in the client, preserve the map rendering performance budget and provide desktop/mobile acceptance evidence separately.

## Validation status
Documentation-only proposal. No client controls, settings or runtime behavior are modified.