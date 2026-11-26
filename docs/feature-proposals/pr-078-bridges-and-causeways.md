# Proposal: permanent bridges and coastal causeways

> Status: design proposal only; this PR does not change map traversal or infrastructure behavior.

## Design goal
Allow engineering of permanent bridges and causeways with capacity, health and strategic vulnerability.

## Gameplay loop
Players invest in a crossing, route forces through it and defend it; opponents can damage the structure to force a detour or repair operation.

## Deterministic infrastructure contract
Infrastructure is simulation state, not decoration. The engine must validate endpoints, terrain, ownership, material cost, capacity and health. Network changes must invalidate dependent path caches in a bounded and deterministic way. A client preview is advisory only.

## Acceptance criteria
- Only valid endpoints connect; bridge capacity is enforced; destroyed crossings invalidate path caches; ownership and health restore correctly.
- Test boundary cells, disconnected components, simultaneous construction and damage, and capture during repair.
- Add worker parity and snapshot/replay tests for network topology and construction progress.
- Profile large-map network updates; avoid full-map scans on every tick.
- Keep existing map files valid and provide a feature flag for maps that do not support the system.

## Implementation boundaries
Follow the map and simulation-layer boundaries in [Game Architecture](../Architecture.md). New structure types require explicit update schemas, client representations, localization and balance documentation. Never alter generated map assets without a reproducible generator change.

## Validation status
Proposal document only; no runtime infrastructure or map files are changed.