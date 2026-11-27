# Proposal: biome packs and curated map content bundles

> Status: design proposal only; this PR does not change map generation, content or scenario runtime.

## Design goal
Organize original or properly licensed map themes and biome visual packs behind metadata manifests, asset provenance and compatibility tags.

## Creator/player workflow
Hosts browse themed maps, filter by player count and size, preview the style and choose a compatible pack for the lobby.

## Reproducibility and content integrity
Map and scenario content must be data-driven, schema-validated and reproducible. A generated world must record its seed and generator version. Visual assets must retain their provenance and applicable license; no content may silently alter authoritative terrain or competitive rules. Imported bundles must not execute arbitrary code.

## Acceptance criteria
- Every asset has documented provenance and compatible license; missing assets fail gracefully; content manifests are versioned; visual packs cannot modify authoritative terrain rules.
- Test invalid metadata, missing assets, edge-size maps, disconnected land/sea topology and unsupported schema versions.
- Verify the same seed and generator version produce byte-for-byte equivalent normalized map data.
- Keep scenario-only rules out of ranked matchmaking unless explicitly approved and versioned.
- Add large-map performance and export-size limits.

## Implementation boundaries
Future work should integrate with the existing map manifest, generator, lobby configuration and scenario/replay data formats. Preserve OpenFront-derived licensing and attribution; use original assets or assets whose license explicitly permits the intended redistribution. Document map moderation and rollback procedures.

## Validation status
Documentation-only proposal. No game code, map asset, generator or production map rotation is changed.