# Proposal: command queuing, waypoints and batch orders

> Status: design proposal only; no client runtime UI is changed in this PR.

## Design goal
Add optional queued orders and waypoint chains for eligible units while keeping execution order deterministic and cancelable.

## Player-facing loop
Players shift-queue destinations or actions for selected formations, inspect the order queue and modify or cancel future orders before they execute.

## Interaction and accessibility contract
All critical actions must remain usable by touch, keyboard and assistive technology where applicable. Provide visible focus, clear labels, reversible actions and safe defaults. User preferences must be stored separately from authoritative match state; client controls issue validated intents rather than directly mutating the simulation.

## Acceptance criteria
- Queue length and action types are bounded; invalid targets are skipped or canceled by documented rules; duplicate orders do not duplicate effects; queue state restores safely.
- Test narrow and wide viewports, touch input, keyboard navigation, focus order and screen-reader labels.
- Verify localization expansion does not clip or hide critical actions.
- Ensure preferences migrate safely and can always be reset.
- Profile UI updates so customization does not increase per-frame work unnecessarily.

## Implementation boundaries
A future implementation must reuse the project's existing HUD, input and localization systems. Keep visual-only state in the client, preserve the map rendering performance budget and provide desktop/mobile acceptance evidence separately.

## Validation status
Documentation-only proposal. No client controls, settings or runtime behavior are modified.