# Proposal: land minefields and breaching teams

> Status: design proposal only; not a runtime implementation.

## Design goal
Add concealed land minefields, engineer breaching and route-risk estimates for ground formations.

## Gameplay loop
Defenders prepare a bounded minefield; attackers use recon or engineers to discover and breach safe lanes before committing larger formations.

## Rules and deterministic state
The engine must validate ownership, line of sight, terrain eligibility, ammunition and action cooldowns. Outcomes must be deterministic and replayable. Any persistent emplacement, cargo, timer or unit status must be included in a versioned snapshot; client-side previews cannot grant authority.

## Acceptance criteria
- Mine locations are hidden from unauthorized views; mines trigger at most once; minefields respect terrain and ownership rules; clearance state persists.
- Include unit tests for range boundaries, map edges, destroyed entities and repeated intents.
- Include worker-parity and snapshot restore tests.
- Keep legacy ground movement and existing defense-post behavior unchanged when the optional system is off.
- Document counterplay and maximum stacking rules so the feature cannot become an unavoidable defense or attack.

## Implementation boundaries
Implement intent and execution contracts in the core, relevant update fields in engine-api, and controls/HUD in the client. Follow the layer boundaries in [Game Architecture](../Architecture.md); simulation code must remain hermetic and must not call browser or server APIs.

## Validation status
This PR only records the proposal. No gameplay implementation or test pass is claimed.