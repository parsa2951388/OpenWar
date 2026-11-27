# Proposal: interactive tutorial campaign and skill challenges

> Status: design proposal only; no client runtime UI is changed in this PR.

## Design goal
Replace a one-pass tutorial with short interactive lessons for economy, expansion, navy, air combat, diplomacy, defense, replay and multiplayer etiquette.

## Player-facing loop
Players complete a lesson, receive contextual feedback and unlock the next exercise; individual challenges can be replayed without resetting overall progress.

## Interaction and accessibility contract
All critical actions must remain usable by touch, keyboard and assistive technology where applicable. Provide visible focus, clear labels, reversible actions and safe defaults. User preferences must be stored separately from authoritative match state; client controls issue validated intents rather than directly mutating the simulation.

## Acceptance criteria
- Tutorial objectives are deterministic; lesson state is separate from competitive records; accessibility settings are honored; outdated lessons are versioned and fail safely.
- Test narrow and wide viewports, touch input, keyboard navigation, focus order and screen-reader labels.
- Verify localization expansion does not clip or hide critical actions.
- Ensure preferences migrate safely and can always be reset.
- Profile UI updates so customization does not increase per-frame work unnecessarily.

## Implementation boundaries
A future implementation must reuse the project's existing HUD, input and localization systems. Keep visual-only state in the client, preserve the map rendering performance budget and provide desktop/mobile acceptance evidence separately.

## Validation status
Documentation-only proposal. No client controls, settings or runtime behavior are modified.