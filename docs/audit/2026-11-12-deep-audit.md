# Open War technical audit — 2026-11-12

## Scope and evidence

This report records only checks completed during the 2026-11-12 audit session. It is not a claim that every game system has been exhaustively tested.

- Repository: `parsa2951388/OpenWar`
- Audited source branch: `main`
- Audit branch: `audit/deep-gameplay-stability`
- Audited live service: `https://open-war-online.onrender.com/`
- Live Render service ID: `srv-dbp0fg942hec73foa5o0`
- Live deployment commit: `1ebc119c6c6ba3e7cab028f09d164b12436d4a6a`
- Live deploy: succeeded on 2026-11-11 18:10 UTC.
- No production configuration or deployment was changed during this audit.

## Confirmed findings

### P1 — Ranked matchmaking API requests fail TLS

Render application logs for the live web service contain repeated failures at 2026-11-12 05:41–05:43 UTC:

```
ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE
Error polling 1v1 lobby: fetch failed
Error polling 2v2 lobby: fetch failed
Error polling clanwars lobby: fetch failed
```

The source of these requests is `src/server/RankedCheckin.ts`. It calls:

```
${ServerEnv.jwtIssuer()}/matchmaking/checkin
```

`ServerEnv.jwtIssuer()` is currently hard-wired to `https://api.${DOMAIN}` (except localhost). The existing test `tests/server/RankedCheckin.test.ts` explicitly expects `https://api.openfront.io/matchmaking/checkin`. Thus this deployed fork is still coupled to the upstream OpenFront API for ranked matchmaking. The TLS handshake failures are real server-side evidence; they explain why ranked queues cannot reliably receive assignments. They do not, by themselves, explain a local solo game failing to start.

Related API dependencies include:

- `src/server/ClusterCheckin.ts`: `/cluster/checkin`
- `src/server/RankedCheckin.ts`: `/matchmaking/checkin`
- `src/server/ServerEnv.ts`: issuer derived from `DOMAIN`
- `src/client/ClientEnv.ts`: browser-side issuer derived from `jwtAudience`
- `src/server/Worker.ts`: `PrivilegeRefresher` reads `/cosmetics.json` and `/reserved_clan_tags`

A correct Open War-owned API origin is not present in the accessible deployment metadata. The Render service metadata intentionally does not expose environment-variable values. Do not guess an API hostname or overwrite production settings. The Cloudflare Open War auth Worker and D1 resources previously recorded for this project were deleted on 2026-11-09, so they cannot be assumed to provide these endpoints now.

### P1 — Live solo match launch could not be validated in the remote browser

A read-only browser smoke test loaded the Render cold-start page (about 30 seconds), opened the main menu and solo setup, and clicked START GAME. No playable canvas appeared in the test window. The remote browser environment could not obtain WebGL2 in the earlier hosted browser validation for this project, so this result is inconclusive: it does not establish whether the production browser runtime itself crashes. A real WebGL2-capable desktop/mobile browser run with console and network capture is still required.

### P1 — Aircraft click crash fix is already merged to main

PR #5, `Fix aircraft crash and restore original world map visuals`, was merged as commit `1ebc119c6c6ba3e7cab028f09d164b12436d4a6a`, and that exact commit is deployed on the live Render service.

The aircraft selection crash root cause addressed by PR #5:

- `UnitGrid.nearbyUnits` predicates receive objects shaped like `{ unit, distSquared }`.
- The previous aircraft selection callback treated that object as a unit, which could throw when selecting an aircraft.
- The fix correctly destructures `({ unit })`, uses the spatial index rather than scanning/sorting every aircraft, and adds a 20,000-aircraft regression case.

PR #5 also restores land/water map overlay layers for World, World 4000 and World 10000, and restores OpenFront-style terrain colors and visual passes disabled by the earlier lightweight-map change.

The PR's GitHub CI run #43070241387 completed successfully: Build, all three test shards, Lint, Format and generated-map checks passed. This validates the merged code and regression tests, but does not replace an actual WebGL2 gameplay test.

## Architecture reviewed

`docs/Architecture.md` describes a deterministic simulation in `packages/engine`, contracts in `packages/engine-api`, shared deterministic map/rules utilities in `packages/engine-lib`, shared wire and map loaders in `packages/shared`, a browser client, a coordinating Node server, and a closed-source Cloudflare Worker API.

Key source files inspected:

- `src/client/controllers/FighterSelectionController.ts`
- `src/client/ClientGameRunner.ts`
- `src/client/TerrainMapFileLoader.ts`
- `src/client/hud/GameRenderer.ts`
- `src/client/render/gl/MapRenderer.ts`
- `src/client/render/gl/Renderer.ts`
- `src/client/render/gl/render-settings.json`
- `packages/engine/src/aircombat/AircraftRules.ts`
- `packages/engine/src/execution/FighterExecution.ts`
- `packages/engine/src/execution/MoveFighterExecution.ts`
- `packages/engine/src/execution/AirportExecution.ts`
- `packages/engine/src/execution/CommercialAircraftExecution.ts`
- `src/server/RankedCheckin.ts`
- `src/server/ClusterCheckin.ts`
- `src/server/LobbyCoordinatorClient.ts`
- `src/server/MasterLobbyService.ts`
- `src/server/WorkerLobbyService.ts`
- `src/server/ServerEnv.ts`
- `src/client/ClientEnv.ts` (browser environment)
- `tests/server/RankedCheckin.test.ts`
- `tests/client/MapRendererContextLoss.test.ts`
- `tests/client/controllers/FighterSelectionController.test.ts`
- `tests/AircraftRules.test.ts`
- `tests/AircraftWorkerParity.test.ts`
- `tests/core/snapshot/AircraftExecutions.test.ts`
- `.github/workflows/ci.yml`

## Render topology observed

The Render workspace has four services attached to the same repository and branch `main`:

- `open-war-online` — web service, `npm run start:render`, free plan, Frankfurt; this is the requested live URL.
- `open-war-game` — web service, `npm run start:server-dev`.
- `open-war-live` — static site, publishes `static`.
- `open-war` — static site, publishes `out`.

All four were configured for auto-deploy from `main`. No service was changed. The duplicate service topology and whether all four are still required should be reconciled before future production configuration changes.

## Remaining validation

Not yet verified in this session:

- Real WebGL2 game launch on a supported browser.
- Aircraft selection, group movement, mission execution, fuel/refuel, combat, carrier launch/recovery in a live match.
- Map appearance at runtime, camera interaction, large-map memory and frame-time behavior.
- Real two-client multiplayer synchronization, reconnect and match persistence.
- Store, inventory, leaderboard, clans and authenticated flows.
- Mobile touch behavior on a physical device.
- Cloudflare API endpoints, Worker routes, D1, JWT issuer/audience and CORS. The relevant old Open War Worker/D1 resources were deleted and no replacement API endpoint was identified.
- Local npm build and test execution from this audit branch. CI evidence cited above is from the already-merged PR #5, not from this audit branch.

## Recommended next corrective work

1. Restore or deploy an Open War-owned API implementing the contracts this client/server consumes; configure a single explicit API origin shared by server and browser. Preserve the current upstream issuer as a deliberate compatibility default until the replacement is verified.
2. Add integration tests for the API routes used by check-in, ranked matchmaking, JWKS, identity, privileges and the client server registry.
3. Run a full browser E2E suite in a WebGL2-capable Chromium environment; record console, failed requests, context loss and screenshots.
4. Test each aircraft type and carrier lifecycle through deterministic engine tests plus a real two-player browser match.
5. Test map loading and rendering for World, World 4000 and World 10000, including overlay assets and context-loss recovery.
6. Review all four Render services and their environment configuration before consolidating or changing any production resources.

## Honest completion status

This branch currently contains this audit report only. No source-code fix is claimed in this audit commit. The already-merged aircraft and map changes are identified above with their CI evidence. The live ranked API TLS failure is confirmed, but a safe endpoint correction requires the intended Open War API origin and a deployed API that implements the required routes.
