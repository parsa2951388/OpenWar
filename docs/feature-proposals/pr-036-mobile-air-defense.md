# Proposal: mobile air-defense units and radar handoff

> Status: design proposal only; not a runtime implementation.

## Design goal
Introduce mobile short-range air-defense vehicles that protect moving columns and hand off aircraft contacts to nearby friendly batteries.

## Gameplay loop
Players attach air-defense vehicles to a task force, choose radar-emission policy and move the protection bubble as the front advances.

## Rules and deterministic state
The engine must validate ownership, line of sight, terrain eligibility, ammunition and action cooldowns. Outcomes must be deterministic and replayable. Any persistent emplacement, cargo, timer or unit status must be included in a versioned snapshot; client-side previews cannot grant authority.

## Acceptance criteria
- Coverage uses a deterministic range query; emissions reveal only permitted information; vehicle destruction removes coverage immediately; overlap does not stack beyond configured caps.
- Include unit tests for range boundaries, map edges, destroyed entities and repeated intents.
- Include worker-parity and snapshot restore tests.
- Keep legacy ground movement and existing defense-post behavior unchanged when the optional system is off.
- Document counterplay and maximum stacking rules so the feature cannot become an unavoidable defense or attack.

## Implementation boundaries
Implement intent and execution contracts in the core, relevant update fields in engine-api, and controls/HUD in the client. Follow the layer boundaries in [Game Architecture](../Architecture.md); simulation code must remain hermetic and must not call browser or server APIs.

## Validation status
This PR only records the proposal. No gameplay implementation or test pass is claimed.