# Open War testing guide

This guide describes the checks available in the repository and what they do **not** prove. For release promotion, use the [release-readiness checklist](RELEASE_CHECKLIST.md).

## Prerequisites and installation

Use Node.js `24.15.x` and npm `12.1.x` from the release lines specified by `package.json`.

```bash
git clone https://github.com/parsa2951388/OpenWar.git
cd OpenWar
npm run inst
```

The `inst` script runs the repository's pinned `npm ci --ignore-scripts` installation procedure.

## Standard local checks

Run the checks relevant to the files changed:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build-prod
```

- `typecheck` checks the root project and the engine, engine API, engine library, worker, shared and binary-schema TypeScript projects.
- `lint` runs Oxlint across the workspace.
- `format:check` verifies formatting with Oxfmt.
- `npm test` runs the client, client-forks and Node Vitest projects.
- `build-prod` creates the production client bundle and asset hash manifest; it does not deploy the service.

The GitHub Actions CI workflow runs the build/typecheck, three test shards and combined test result, lint, formatting and generated-map consistency checks. Inspect the run for the exact pull request head SHA; results from an earlier commit do not validate a later head.

## Focused aircraft regression coverage

The aircraft work has focused tests in these files:

| Test file | Main responsibility |
| --- | --- |
| `tests/AircraftRules.test.ts` | Flight distance, fuel planning, return reserve, carrier eligibility, refuelling, repair, damage and stealth detection rules |
| `tests/AircraftWorkerParity.test.ts` | Worker configuration parity, aircraft role statistics, target filtering and target reservation |
| `tests/client/InputHandlerAircraftPriority.test.ts` | Pointer-click priority between aircraft/warship controllers and the radial menu |
| `tests/core/snapshot/AircraftExecutions.test.ts` | Snapshot round trips for airports, commercial flights, fighters, air attacks and movement |

Run these tests directly while iterating on the aircraft layer:

```bash
npx vitest run \
  tests/AircraftRules.test.ts \
  tests/AircraftWorkerParity.test.ts \
  tests/client/InputHandlerAircraftPriority.test.ts \
  tests/core/snapshot/AircraftExecutions.test.ts
```

A focused pass is useful feedback, but it does not replace the full test suite or a live multiplayer acceptance test.

## Matchmaking integration harnesses

The matchmaking scripts use separate test environments and are not part of `npm test`.

- `npm run test:matchmaking` uses an in-process fake WebSocket matchmaking server.
- `npm run test:matchmaking:e2e` uses a local API Worker and the development game server to test a real local queue and game assignment.
- `npm run test:matchmaking:cancel` exercises cancellation and requeue behavior.

Read [tests/matchmaking/README.md](../tests/matchmaking/README.md) for the required local services, ports, modes and expected outcomes. Do not point these harnesses at a public production service unless a dedicated, approved test plan explicitly requires it.

## Generated maps

When map source or generation inputs change, run:

```bash
npm run gen-maps
```

Commit the generated files produced by the generator. CI regenerates maps and fails if the working tree differs afterward.

## Manual acceptance still matters

Automated tests cannot establish that a public release is operational. For relevant changes, record separate evidence for:

- a full solo match;
- two independent clients completing a multiplayer match;
- aircraft construction, orders, combat, fuel and recovery in a live match;
- reconnect and WebSocket behavior;
- a physical phone's touch controls and responsive layout;
- the public service running the exact commit under test.

State clearly which tests were run, which were skipped and which remain blocked by missing infrastructure. Never describe a local harness, static build or green CI run as proof of production acceptance.
