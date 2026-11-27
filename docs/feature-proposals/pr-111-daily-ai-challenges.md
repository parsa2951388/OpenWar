# Proposal: daily AI challenge scenarios and rotating objectives

> Status: design proposal only; this PR does not change map generation, content or scenario runtime.

## Design goal
Offer rotating single-player challenges with fixed seeds, defined AI archetypes and scoreable optional objectives.

## Creator/player workflow
Players attempt a daily scenario, compare their verified result and replay it to improve execution while the underlying challenge remains consistent for the day.

## Reproducibility and content integrity
Map and scenario content must be data-driven, schema-validated and reproducible. A generated world must record its seed and generator version. Visual assets must retain their provenance and applicable license; no content may silently alter authoritative terrain or competitive rules. Imported bundles must not execute arbitrary code.

## Acceptance criteria
- Challenge seed and rules are fixed for the published period; scores are server-validated; duplicate submissions cannot improve rank; challenges are solvable and compatible with the published game version.
- Test invalid metadata, missing assets, edge-size maps, disconnected land/sea topology and unsupported schema versions.
- Verify the same seed and generator version produce byte-for-byte equivalent normalized map data.
- Keep scenario-only rules out of ranked matchmaking unless explicitly approved and versioned.
- Add large-map performance and export-size limits.

## Implementation boundaries
Future work should integrate with the existing map manifest, generator, lobby configuration and scenario/replay data formats. Preserve OpenFront-derived licensing and attribution; use original assets or assets whose license explicitly permits the intended redistribution. Document map moderation and rollback procedures.

## Validation status
Documentation-only proposal. No game code, map asset, generator or production map rotation is changed.