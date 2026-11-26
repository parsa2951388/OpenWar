# Proposal: road networks and strategic road upgrades

> Status: design proposal only; this PR does not change map traversal or infrastructure behavior.

## Design goal
Add buildable road links that improve ground-unit movement and logistics throughput while consuming construction capacity and materials.

## Gameplay loop
Players connect cities and front-line bases, upgrade key corridors and defend road chokepoints from raids or bombardment.

## Deterministic infrastructure contract
Infrastructure is simulation state, not decoration. The engine must validate endpoints, terrain, ownership, material cost, capacity and health. Network changes must invalidate dependent path caches in a bounded and deterministic way. A client preview is advisory only.

## Acceptance criteria
- Roads can only follow valid terrain; pathfinding uses the same edge costs on all clients; capture and destruction update connectivity; network state survives snapshots.
- Test boundary cells, disconnected components, simultaneous construction and damage, and capture during repair.
- Add worker parity and snapshot/replay tests for network topology and construction progress.
- Profile large-map network updates; avoid full-map scans on every tick.
- Keep existing map files valid and provide a feature flag for maps that do not support the system.

## Implementation boundaries
Follow the map and simulation-layer boundaries in [Game Architecture](../Architecture.md). New structure types require explicit update schemas, client representations, localization and balance documentation. Never alter generated map assets without a reproducible generator change.

## Validation status
Proposal document only; no runtime infrastructure or map files are changed.