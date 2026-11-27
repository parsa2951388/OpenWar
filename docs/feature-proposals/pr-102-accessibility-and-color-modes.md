# Proposal: accessibility settings, color-vision modes and reduced motion

> Status: design proposal only; no client runtime UI is changed in this PR.

## Design goal
Add accessible palettes, high-contrast overlays, reduced-motion rendering, scalable text and clear non-color indicators for teams and strategic state.

## Player-facing loop
Players configure visual and interaction preferences from a dedicated panel and see consistent results across menus, map layers, replay and HUD.

## Interaction and accessibility contract
All critical actions must remain usable by touch, keyboard and assistive technology where applicable. Provide visible focus, clear labels, reversible actions and safe defaults. User preferences must be stored separately from authoritative match state; client controls issue validated intents rather than directly mutating the simulation.

## Acceptance criteria
- Team identity is never conveyed by color alone; reduced-motion mode disables nonessential animation; text scaling preserves layout usability; settings persist without affecting simulation.
- Test narrow and wide viewports, touch input, keyboard navigation, focus order and screen-reader labels.
- Verify localization expansion does not clip or hide critical actions.
- Ensure preferences migrate safely and can always be reset.
- Profile UI updates so customization does not increase per-frame work unnecessarily.

## Implementation boundaries
A future implementation must reuse the project's existing HUD, input and localization systems. Keep visual-only state in the client, preserve the map rendering performance budget and provide desktop/mobile acceptance evidence separately.

## Validation status
Documentation-only proposal. No client controls, settings or runtime behavior are modified.