# Proposal: nuclear fallout cleanup and contamination zones

> Status: design proposal only; this PR does not change map traversal or infrastructure behavior.

## Design goal
Introduce a staged cleanup process for fallout-affected regions with protective equipment, cleanup resources and delayed land recovery.

## Gameplay loop
Players secure contaminated sites, send specialist crews, contain spread and reopen infrastructure only after risk falls below configured thresholds.

## Deterministic infrastructure contract
Infrastructure is simulation state, not decoration. The engine must validate endpoints, terrain, ownership, material cost, capacity and health. Network changes must invalidate dependent path caches in a bounded and deterministic way. A client preview is advisory only.

## Acceptance criteria
- Contamination never becomes negative; cleanup is deterministic; current fallout defense mechanics remain backward-compatible; hidden health/status data is not leaked.
- Test boundary cells, disconnected components, simultaneous construction and damage, and capture during repair.
- Add worker parity and snapshot/replay tests for network topology and construction progress.
- Profile large-map network updates; avoid full-map scans on every tick.
- Keep existing map files valid and provide a feature flag for maps that do not support the system.

## Implementation boundaries
Follow the map and simulation-layer boundaries in [Game Architecture](../Architecture.md). New structure types require explicit update schemas, client representations, localization and balance documentation. Never alter generated map assets without a reproducible generator change.

## Validation status
Proposal document only; no runtime infrastructure or map files are changed.