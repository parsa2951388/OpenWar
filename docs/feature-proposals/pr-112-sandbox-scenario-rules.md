# Proposal: sandbox scenario rules and custom objective bundles

> Status: design proposal only; this PR does not change map generation, content or scenario runtime.

## Design goal
Create a safe sandbox format for combining custom objectives, start conditions, bot profiles and optional rules into a shareable non-ranked scenario.

## Creator/player workflow
Players load a scenario bundle, inspect its rules, launch a private sandbox match and share the configuration with collaborators.

## Reproducibility and content integrity
Map and scenario content must be data-driven, schema-validated and reproducible. A generated world must record its seed and generator version. Visual assets must retain their provenance and applicable license; no content may silently alter authoritative terrain or competitive rules. Imported bundles must not execute arbitrary code.

## Acceptance criteria
- Scenario bundles use strict schemas and no executable code; public/ranked matchmaking rejects incompatible sandbox rules; all objective states are deterministic; export and import are versioned and bounded.
- Test invalid metadata, missing assets, edge-size maps, disconnected land/sea topology and unsupported schema versions.
- Verify the same seed and generator version produce byte-for-byte equivalent normalized map data.
- Keep scenario-only rules out of ranked matchmaking unless explicitly approved and versioned.
- Add large-map performance and export-size limits.

## Implementation boundaries
Future work should integrate with the existing map manifest, generator, lobby configuration and scenario/replay data formats. Preserve OpenFront-derived licensing and attribution; use original assets or assets whose license explicitly permits the intended redistribution. Document map moderation and rollback procedures.

## Validation status
Documentation-only proposal. No game code, map asset, generator or production map rotation is changed.