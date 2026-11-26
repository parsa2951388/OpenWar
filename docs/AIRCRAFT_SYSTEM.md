# Aircraft systems overview

This document describes the current aircraft implementation in the `main` source
branch. It is a developer-oriented map of the engine rules and execution flow,
not a claim that every behavior has passed live multiplayer acceptance. See the
[release-readiness checklist](RELEASE_CHECKLIST.md) for the outstanding
acceptance gates.

## Roles and profile data

The engine models four aircraft roles:

- `air-fighter`
- `stealth-fighter`
- `ground-attacker`
- `commercial`

Combat-aircraft configuration is supplied by game configuration rather than
embedding all balance values in the flight rules. An aircraft profile includes:

- fuel consumed per map tile and total fuel capacity;
- maximum movement distance per simulation tick;
- damage against aircraft and against ground units/structures;
- a detection multiplier; lower values make the aircraft harder to detect;
- whether the aircraft can launch from and recover to an aircraft carrier.

Commercial aircraft are non-combat aircraft: profile validation rejects non-zero
air or ground damage for the commercial role.

## Flight, fuel and servicing

The deterministic, renderer-independent rules live in
`packages/engine/src/aircombat/AircraftRules.ts`. They are shared by simulation
code and tests.

- Air distance is Euclidean map distance; it does not use land pathfinding.
- Fuel costs round up, so a partial tile is not free.
- Mission planning accounts for the outbound leg, the return leg to a recovery
  base and a reserve (10% by default).
- A mission is rejected before takeoff if the aircraft is destroyed, already in
  flight/returning, or does not have enough fuel for the complete route.
- Fuel consumption is atomic: the rule returns no result rather than allowing
  fuel to become negative.
- Refuelling and repair are restricted to a friendly base and are clamped to the
  aircraft's configured capacity/health limit.

The operational status model includes `parked`, `in-flight`, `returning`,
`refuelling`, `repairing` and `destroyed`.

### Airports and carriers

Land airports are valid bases for aircraft. Carrier use is conditional on the
aircraft profile's `carrierCapable` flag; do not infer that every aircraft can
operate from a carrier.

Airport execution is maintained by `AirportExecution`. An active, completed
airport periodically evaluates whether to spawn a commercial flight. Eligible
destination airports belong to players who can trade with the source owner. The
destination cache is refreshed periodically and uses destination level and route
ordering as weights.

### Commercial flights

`CommercialAircraftExecution` uses the air pathfinder to move a commercial
aircraft between airports. The flight is cancelled when the destination or trade
relationship is no longer valid. If the aircraft is captured, it seeks a
suitable airport belonging to its new owner; when it completes successfully, the
gold reward is credited to the captor instead of the original trading pair.

Commercial aircraft do not carry combat damage. Their purpose is trade-route
activity and gold income, not air combat.

## Combat aircraft and missions

The fighter simulation is implemented by `FighterExecution`. It tracks patrol,
target selection, combat state, low-fuel and damage/ammunition return behavior,
refuelling and recovery. Manual movement is represented by
`MoveFighterExecution`, which updates the selected aircraft's patrol destination
and clears stale return/service state.

The current combat roles have different intended jobs:

- **Air Fighter:** Air-to-air interception and fighter combat.
- **Stealth Fighter:** Stealth-oriented air combat and interception.
- **Ground Attacker:** Ground strikes and structure attacks.
- **Commercial:** Non-combat trading flights between eligible airports.

Exact weapon counts, movement speed, fuel capacities, damage and service values
are configuration data. Check `EngineConfig` and the regression tests before
changing balance; do not copy values from an old README or assume a balance
value is universal across game modes.

### Radar and stealth detection

Advanced Warfare matches add an early-warning radar network:

- Active SAM launchers provide a 36-tile detection radius for friendly air
  patrols.
- Dedicated Radar Stations provide a 56-tile detection radius but do not
  intercept missiles.
- Active radar installations owned by a team-mate share their coverage.
- Air fighters cannot automatically acquire an enemy stealth fighter outside
  friendly radar coverage.
- Other game modes retain the legacy target-visibility rules.

Radar coverage is evaluated from the stealth aircraft's current tile during
target selection. It does not change SAM interception rules or expose a
stealth aircraft to unrelated ground units.

### Weapons and defenses

- Air-to-air missile flights are represented by `FighterAamExecution` and a
  moving shell entity.
- Missile execution reserves a launching-fighter/target pair to avoid duplicate
  in-flight targeting and clears the reservation on completion.
- Eligible aircraft can consume flares for an evasion attempt when the mission
  has flare evasion enabled.
- Ground-attack bombing is represented by `FighterBombExecution`; it applies
  area effects to eligible nearby units and notifies a player defending the
  target tile.
- Structure interactions and damage immunity are explicit engine rules. Change
  them with regression coverage rather than relying on visual behavior alone.

## Pathfinding and deterministic state

Air movement uses `AirPathFinder`, separate from land pathfinding. Aircraft,
commercial flights, missiles and related executions persist their state through
versioned execution snapshot schemas. Snapshot compatibility matters for
deterministic simulation, replay and worker parity.

When changing an execution, review:

- initialization and per-tick state transitions;
- invalid/deleted targets and missing recovery bases;
- fuel, service and return paths;
- snapshot write/restore behavior;
- client/server and Worker parity.

## Relevant implementation and tests

- Shared flight/fuel rules: `packages/engine/src/aircombat/AircraftRules.ts`
- Fighter patrol and combat: `packages/engine/src/execution/FighterExecution.ts`
- Airport lifecycle: `packages/engine/src/execution/AirportExecution.ts`
- Commercial flight routing:
  `packages/engine/src/execution/CommercialAircraftExecution.ts`
- Air pathfinding: `packages/engine/src/pathfinding/PathFinder.Air.ts`
- Air-to-air missiles: `packages/engine/src/execution/FighterAamExecution.ts`
- Ground-attack bombs: `packages/engine/src/execution/FighterBombExecution.ts`
- Direct movement orders:
  `packages/engine/src/execution/MoveFighterExecution.ts`
- Shared rule tests: `tests/AircraftRules.test.ts`
- Worker/config parity tests: `tests/AircraftWorkerParity.test.ts`
- Client input priority:
  `tests/client/InputHandlerAircraftPriority.test.ts`
- Execution snapshots:
  `tests/core/snapshot/AircraftExecutions.test.ts`

Use the [testing guide](TESTING.md) for commands and the distinction between
focused tests, full CI and live acceptance.
