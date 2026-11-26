# Proposal: day-night cycle and operational visibility

> Status: design proposal only; no environmental simulation is enabled by this PR.

## Design goal
Add an optional match clock with gradual lighting and role-specific visibility modifiers rather than a purely cosmetic time-of-day overlay.

## Player-facing loop
Players schedule operations around daylight, use night movement for concealment and deploy illumination or sensors to counter darkness.

## Simulation and map safety
Environmental state must be generated from deterministic seeds and bounded by the selected map's valid tiles. The engine owns passability, damage and resource effects; the renderer only visualizes confirmed state. Any change to walkability or navigability must invalidate affected pathfinding caches predictably.

## Acceptance criteria
- Tick-to-time mapping is deterministic; client rendering matches authoritative visibility; no extra simulation work occurs when disabled; time persists in replays.
- Test map edges, disconnected regions, simultaneous weather transitions and disabled-feature parity.
- Add snapshot/replay coverage for environmental phase, event seed and affected-region state.
- Provide a clear forecast model that communicates uncertainty without exposing hidden opponents.
- Include performance tests on large maps so effects do not add unbounded per-tile work each tick.

## Implementation boundaries
Follow the engine hermeticity and map contracts described in [Game Architecture](../Architecture.md). Avoid direct browser, server or wall-clock access inside deterministic simulation code. Use configuration-driven intensity, duration and frequency values.

## Validation status
Proposal only. No map asset, runtime rule or production configuration is changed.