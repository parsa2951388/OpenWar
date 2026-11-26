# Proposal: map voting, rotation policies and anti-repeat fairness

> Status: design proposal only; this PR does not change map generation, content or scenario runtime.

## Design goal
Add configurable map pools with fair voting, rotation history, tie-breakers and protections against repeated map selections.

## Creator/player workflow
Players vote from an eligible pool, see why maps are included or excluded and enter a selected map based on a published rule.

## Reproducibility and content integrity
Map and scenario content must be data-driven, schema-validated and reproducible. A generated world must record its seed and generator version. Visual assets must retain their provenance and applicable license; no content may silently alter authoritative terrain or competitive rules. Imported bundles must not execute arbitrary code.

## Acceptance criteria
- Voting is one-per-eligible-player; ties resolve deterministically; rotation state is server-authoritative; unsupported maps are filtered before voting.
- Test invalid metadata, missing assets, edge-size maps, disconnected land/sea topology and unsupported schema versions.
- Verify the same seed and generator version produce byte-for-byte equivalent normalized map data.
- Keep scenario-only rules out of ranked matchmaking unless explicitly approved and versioned.
- Add large-map performance and export-size limits.

## Implementation boundaries
Future work should integrate with the existing map manifest, generator, lobby configuration and scenario/replay data formats. Preserve OpenFront-derived licensing and attribution; use original assets or assets whose license explicitly permits the intended redistribution. Document map moderation and rollback procedures.

## Validation status
Documentation-only proposal. No game code, map asset, generator or production map rotation is changed.