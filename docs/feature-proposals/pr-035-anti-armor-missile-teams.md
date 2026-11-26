# Proposal: anti-armor guided missile teams

> Status: design proposal only; not a runtime implementation.

## Design goal
Add infantry anti-armor teams with limited guided ammunition, acquisition delay and countermeasures against armored targets.

## Gameplay loop
Teams deploy into covered positions, acquire a target, fire a guided missile and reposition before return fire or detection forces them out.

## Rules and deterministic state
The engine must validate ownership, line of sight, terrain eligibility, ammunition and action cooldowns. Outcomes must be deterministic and replayable. Any persistent emplacement, cargo, timer or unit status must be included in a versioned snapshot; client-side previews cannot grant authority.

## Acceptance criteria
- Only eligible armored targets can be engaged; missiles cannot home through invalid terrain; decoys and smoke have bounded effects; ammunition and reload timers survive snapshots.
- Include unit tests for range boundaries, map edges, destroyed entities and repeated intents.
- Include worker-parity and snapshot restore tests.
- Keep legacy ground movement and existing defense-post behavior unchanged when the optional system is off.
- Document counterplay and maximum stacking rules so the feature cannot become an unavoidable defense or attack.

## Implementation boundaries
Implement intent and execution contracts in the core, relevant update fields in engine-api, and controls/HUD in the client. Follow the layer boundaries in [Game Architecture](../Architecture.md); simulation code must remain hermetic and must not call browser or server APIs.

## Validation status
This PR only records the proposal. No gameplay implementation or test pass is claimed.