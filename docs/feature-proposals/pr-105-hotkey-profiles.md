# Proposal: editable hotkey profiles and input conflict detection

> Status: design proposal only; no client runtime UI is changed in this PR.

## Design goal
Provide rebindable keyboard shortcuts with named profiles, conflict detection and safe defaults for desktop and tablet keyboard users.

## Player-facing loop
Players edit a binding, see any conflicting action, resolve or disable it, and switch profiles without losing the default control scheme.

## Interaction and accessibility contract
All critical actions must remain usable by touch, keyboard and assistive technology where applicable. Provide visible focus, clear labels, reversible actions and safe defaults. User preferences must be stored separately from authoritative match state; client controls issue validated intents rather than directly mutating the simulation.

## Acceptance criteria
- Reserved browser/system keys are handled safely; duplicate bindings are reported; every key action has a reachable UI alternative; profiles are versioned and resettable.
- Test narrow and wide viewports, touch input, keyboard navigation, focus order and screen-reader labels.
- Verify localization expansion does not clip or hide critical actions.
- Ensure preferences migrate safely and can always be reset.
- Profile UI updates so customization does not increase per-frame work unnecessarily.

## Implementation boundaries
A future implementation must reuse the project's existing HUD, input and localization systems. Keep visual-only state in the client, preserve the map rendering performance budget and provide desktop/mobile acceptance evidence separately.

## Validation status
Documentation-only proposal. No client controls, settings or runtime behavior are modified.