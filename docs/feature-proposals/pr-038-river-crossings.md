# Proposal: river crossings, pontoon bridges and bridge destruction

> Status: design proposal only; not a runtime implementation.

## Design goal
Add river crossing constraints and engineer-built temporary pontoon bridges with durability and limited throughput.

## Gameplay loop
Players seize or build a crossing, route units through a capacity-limited bridge, and may demolish it to delay an advancing force.

## Rules and deterministic state
The engine must validate ownership, line of sight, terrain eligibility, ammunition and action cooldowns. Outcomes must be deterministic and replayable. Any persistent emplacement, cargo, timer or unit status must be included in a versioned snapshot; client-side previews cannot grant authority.

## Acceptance criteria
- Pathfinding respects bridge availability; crossing capacity is enforced per tick; destroyed bridges invalidate routes safely; bridge health survives snapshots.
- Include unit tests for range boundaries, map edges, destroyed entities and repeated intents.
- Include worker-parity and snapshot restore tests.
- Keep legacy ground movement and existing defense-post behavior unchanged when the optional system is off.
- Document counterplay and maximum stacking rules so the feature cannot become an unavoidable defense or attack.

## Implementation boundaries
Implement intent and execution contracts in the core, relevant update fields in engine-api, and controls/HUD in the client. Follow the layer boundaries in [Game Architecture](../Architecture.md); simulation code must remain hermetic and must not call browser or server APIs.

## Validation status
This PR only records the proposal. No gameplay implementation or test pass is claimed.