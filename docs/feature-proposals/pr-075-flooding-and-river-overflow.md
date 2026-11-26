# Proposal: floods, river overflow and evacuation

> Status: design proposal only; no environmental simulation is enabled by this PR.

## Design goal
Add flood events that temporarily block low-lying terrain, damage exposed infrastructure and create evacuation objectives.

## Player-facing loop
Players monitor flood warnings, move units and supplies to high ground, repair barriers and exploit temporary route closures.

## Simulation and map safety
Environmental state must be generated from deterministic seeds and bounded by the selected map's valid tiles. The engine owns passability, damage and resource effects; the renderer only visualizes confirmed state. Any change to walkability or navigability must invalidate affected pathfinding caches predictably.

## Acceptance criteria
- Flood masks are bounded by map topology; pathfinding reacts to passability changes; damage is applied once; evacuation state survives snapshots.
- Test map edges, disconnected regions, simultaneous weather transitions and disabled-feature parity.
- Add snapshot/replay coverage for environmental phase, event seed and affected-region state.
- Provide a clear forecast model that communicates uncertainty without exposing hidden opponents.
- Include performance tests on large maps so effects do not add unbounded per-tile work each tick.

## Implementation boundaries
Follow the engine hermeticity and map contracts described in [Game Architecture](../Architecture.md). Avoid direct browser, server or wall-clock access inside deterministic simulation code. Use configuration-driven intensity, duration and frequency values.

## Validation status
Proposal only. No map asset, runtime rule or production configuration is changed.