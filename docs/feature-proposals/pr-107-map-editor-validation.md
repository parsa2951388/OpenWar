# Proposal: map editor with topology and spawn validation

> Status: design proposal only; this PR does not change map generation, content or scenario runtime.

## Design goal
Provide a map-authoring workflow to place terrain, regions, ports, spawn zones and metadata with repeatable validation against engine map constraints.

## Creator/player workflow
Creators edit a map, run validation for disconnected regions or illegal spawns, preview it at supported sizes and export a versioned source package.

## Reproducibility and content integrity
Map and scenario content must be data-driven, schema-validated and reproducible. A generated world must record its seed and generator version. Visual assets must retain their provenance and applicable license; no content may silently alter authoritative terrain or competitive rules. Imported bundles must not execute arbitrary code.

## Acceptance criteria
- Editor output is reproducible; spawn and topology checks match engine rules; invalid maps cannot enter public rotation; generated assets are not committed without source and generator provenance.
- Test invalid metadata, missing assets, edge-size maps, disconnected land/sea topology and unsupported schema versions.
- Verify the same seed and generator version produce byte-for-byte equivalent normalized map data.
- Keep scenario-only rules out of ranked matchmaking unless explicitly approved and versioned.
- Add large-map performance and export-size limits.

## Implementation boundaries
Future work should integrate with the existing map manifest, generator, lobby configuration and scenario/replay data formats. Preserve OpenFront-derived licensing and attribution; use original assets or assets whose license explicitly permits the intended redistribution. Document map moderation and rollback procedures.

## Validation status
Documentation-only proposal. No game code, map asset, generator or production map rotation is changed.