# Proposal: seeded procedural maps and parameterized world generation

> Status: design proposal only; this PR does not change map generation, content or scenario runtime.

## Design goal
Design a deterministic map generator with seed, continent count, island density, water ratio, chokepoints and spawn-balance parameters.

## Creator/player workflow
Hosts tune generation parameters, preview a seeded result and share the seed so another lobby can recreate the same world.

## Reproducibility and content integrity
Map and scenario content must be data-driven, schema-validated and reproducible. A generated world must record its seed and generator version. Visual assets must retain their provenance and applicable license; no content may silently alter authoritative terrain or competitive rules. Imported bundles must not execute arbitrary code.

## Acceptance criteria
- A fixed seed and version always reproduce the same map; parameters are bounded; all outputs pass topology and spawn validation; generator version is recorded with the replay.
- Test invalid metadata, missing assets, edge-size maps, disconnected land/sea topology and unsupported schema versions.
- Verify the same seed and generator version produce byte-for-byte equivalent normalized map data.
- Keep scenario-only rules out of ranked matchmaking unless explicitly approved and versioned.
- Add large-map performance and export-size limits.

## Implementation boundaries
Future work should integrate with the existing map manifest, generator, lobby configuration and scenario/replay data formats. Preserve OpenFront-derived licensing and attribution; use original assets or assets whose license explicitly permits the intended redistribution. Document map moderation and rollback procedures.

## Validation status
Documentation-only proposal. No game code, map asset, generator or production map rotation is changed.