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

The audit branch now contains a narrowly scoped Cloudflare Worker gateway at `https://openwar-api-gateway.parsaoj.workers.dev`. It pins upstream traffic to `https://api.openfront.io`; it is a transport proxy, not an Open War-owned replacement identity or matchmaking backend. The Worker and its EU D1 failure log were created and deployed during this session. Read-only live checks returned HTTP 200 for `/__health` (storage `ok`) and `/.well-known/jwks.json`. A request for `/cluster.json?site=openfront.io` returned valid registry data (`latest` plus servers `c` and `d`), while `site=open-war-online.onrender.com` returned `Unknown site`. These checks confirm the gateway can reach the upstream API and that the upstream does not currently list the Render host.

The branch adds `OPENWAR_API_ORIGIN` as a validated transport-origin override while retaining `jwtIssuer()` for token issuer/audience validation. Ranked and cluster check-in, coordinator WebSocket, JWKS, user profile, privileges and map-weight requests are routed through this transport origin. `/map_weights` was specifically found still using the issuer after the first pass; it is now routed through the gateway and the gateway allowlist includes that route.

The live Render service was not updated with `OPENWAR_API_ORIGIN`, and no production environment values were changed. The branch adds validated fallbacks to Render's injected `RENDER_EXTERNAL_HOSTNAME` and `RENDER_GIT_COMMIT`: this targets the confirmed registration gap where the current `start:render` script stamps `GIT_COMMIT=OPENWAR` and the current public-host derivation returns undefined when no `SUBDOMAIN` exists. The resulting registration behavior still requires branch CI and a controlled deployed test. The live unknown-site response remains evidence that registration has not happened yet.

The Render service metadata does not expose environment-variable values. The gateway therefore preserves the existing upstream dependency and does not establish an Open War-owned identity or matchmaking service. A genuine independent backend would require porting the upstream API's identity, registry, matchmaking, and related contracts; that work is outside this transport fix.

### P1 — Solo gameplay and spawn selection only partially tested

A live read-only browser test opened the main menu, SOLO, WORLD map selection and START GAME. A playable world canvas appeared with land, sea, mountains/deserts, political borders and circular markers; mouse drag panning worked and no browser console/network errors were reported. A second automation reached tutorial step 1/22, which requires the player to click the canvas to choose a spawn. The remote browser could not complete that canvas click, so the HUD remained hidden. This is a test-harness limitation, not proof of a game defect. A physical browser session or browser E2E harness with coordinate-level canvas interaction is required to test the full match.

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

## Dependency security snapshot

The CI `npm ci` audit of the repository lockfile reported **17 known dependency advisories** at the time of this audit: 6 moderate, 7 high and 4 critical. The separate candidate lockfile audit on PR #6 reduced the candidate tree to four moderate findings, but its advisory job intentionally exited non-zero while any finding remained; the candidate was uploaded as an artifact and was not committed to this branch or deployed. Do not treat the dependency state as clean. Review the affected package paths and update compatible packages in a dedicated lockfile change with CI rerun.

## Additional confirmed server configuration issue

The checked-in `package.json` starts the Render web service through `start:render`, which stamps `GIT_COMMIT=OPENWAR`. `packages/shared/src/ServerList.ts` validates published server versions as 7–40 hexadecimal characters, so that label is not a valid registry version. The pre-audit `ServerEnv.publicHost()` also returned no host on a standalone Render instance when `SUBDOMAIN`/ `GAME_HOST` were absent. The audit branch addresses both using Render's injected external hostname and actual Git SHA, with unit tests. Render documents these injected values at https://render.com/docs/environment-variables.

### P0 — Render production launcher forces development mode and exposes a known admin-bot key

The current `main` branch `package.json` sets `start:render` to execute the server with `GAME_ENV=dev`, the public Cloudflare Turnstile test site key, the documented `WARNING_DEV_API_KEY_DO_NOT_USE_IN_PRODUCTION` value, the documented `WARNING_DEV_ADMIN_BOT_KEY_DO_NOT_USE_IN_PRODUCTION` value and the non-SHA `GIT_COMMIT=OPENWAR` label. Render's live web service uses `npm run start:render`, so these values are passed into the live server process by the checked-in start command; no secret-value inspection was needed to confirm this.

This is a security boundary failure, not just a development-label issue. In `src/server/jwt.ts`, Dev mode accepts a raw persistent ID where a signed JWT is required. In `src/server/Worker.ts`, Dev mode skips first-join Turnstile/admission verification and skips subscription/payment checks for public lobby listing and queueing. In `src/server/AdminBotRoutes.ts`, an unset key disables the admin-bot routes, but the current Render command supplies the published placeholder key, so the HTTP routes accept that known value. An external caller who knows the repository's placeholder can authenticate to the Admin Bot API.

**Correction available:** Draft PR #6 replaces the inline development command with `scripts/start-render.ts` and a fail-closed `configureRenderEnvironment` guard, removes the known admin-bot placeholder and requires an explicit safe Render configuration. It also includes targeted UnitGrid and MapRenderer memory-lifecycle fixes. PR #6 is not release-ready yet: its current CI run fails Prettier on `docs/OpenWarDeepAudit.md` and its dependency advisory candidate leaves four moderate findings. The launcher must not be switched in the live Render service until `GAME_ENV`, `DOMAIN`, `API_KEY`, live `TURNSTILE_SITE_KEY`, `NUM_WORKERS` and `INSTANCE_LETTER` are reviewed/set in Render. Environment values are not exposed by the Render service metadata available to this audit.

The browser gameplay test did not reach the unit/build HUD because spawn selection was blocked at the canvas tutorial step. Consequently the audit has not yet verified aircraft availability, prices, aircraft selection on the live deployment, fuel/refuel lifecycle, carrier behavior, store, inventory, leaderboard, clans, two-player networking or mobile touch on a physical device. No claim is made that these systems are currently complete.

## Render topology observed

The Render workspace has four services attached to the same repository and branch `main`:

- `open-war-online` — web service, `npm run start:render`, free plan, Frankfurt; this is the requested live URL.
- `open-war-game` — web service, `npm run start:server-dev`.
- `open-war-live` — static site, publishes `static`.
- `open-war` — static site, publishes `out`.

All four were configured for auto-deploy from `main`. No service was changed. The duplicate service topology and whether all four are still required should be reconciled before future production configuration changes.

## Remaining validation

The source-level gateway and Render discovery changes passed the current-head GitHub Actions CI on 2026-11-12. Run `43170054796` passed Build/typecheck, Lint, Prettier, Generated Maps, Test shards 1/3, 2/3 and 3/3; the additional unsharded Test job also passed. The required Milestone check passed after PR #7 was assigned the existing milestone. A second duplicate run `43170087535` also passed Build, Lint, Prettier and all three shards; its map-generation step completed successfully. These results validate the branch against CI but do not validate an end-to-end live Render matchmaking session. The gateway's newly added `/map_weights` route is present in the audit branch but has not yet been deployed to the Worker.

Not yet verified in this session:

- Real WebGL2 game launch on a supported browser.
- Aircraft selection, group movement, mission execution, fuel/refuel, combat, carrier launch/recovery in a live match.
- Full visual comparison against OpenFront after a player spawn, including territory palette, country/player labels, troop counts, building/port icons and HUD composition. The live test only confirmed base world canvas, terrain/water, political outlines and camera pan; the screenshot automation could not complete spawn selection. Large-map memory and frame-time profiling also remain unverified.
- Real two-client multiplayer synchronization, reconnect and match persistence.
- Store, inventory, leaderboard, clans and authenticated flows.
- Mobile touch behavior on a physical device.
- POST `/cluster/checkin` and `/matchmaking/*` through the gateway, actual CORS/preflight behavior from the live browser, API-key rejection behavior, WebSocket 101 upgrade through Cloudflare, rate-limit/abuse resistance, and the `/map_weights` route after Worker deployment. The gateway's read-only health/JWKS/cluster GET checks passed and D1's `gateway_failures` table/index were verified by SQL. The gateway still proxies to OpenFront's upstream API and is not an independent Open War backend.
- Physical-device WebGL2/browser compatibility and performance profiling. The GitHub Actions CI results above are from this audit branch, not inferred from PR #5.

## Recommended next corrective work

1. Restore or deploy an Open War-owned API implementing the contracts this client/server consumes; configure a single explicit API origin shared by server and browser. Preserve the current upstream issuer as a deliberate compatibility default until the replacement is verified.
2. Add integration tests and live contract checks for check-in, ranked matchmaking, JWKS, identity, privileges, lobby WebSocket upgrades, CORS, API-key rejection and client registry.
3. Run a full browser E2E suite in a WebGL2-capable Chromium environment; record console, failed requests, context loss and screenshots.
4. Test each aircraft type and carrier lifecycle through deterministic engine tests plus a real two-player browser match.
5. Test map loading and rendering for World, World 4000 and World 10000, including overlay assets and context-loss recovery.
6. Review all four Render services and their environment configuration before consolidating or changing any production resources.

## Corrective changes on the audit branch

The branch now contains source changes and tests, in addition to this report:

- Adds a validated `OPENWAR_API_ORIGIN` transport override to `ServerEnv`, while leaving JWT issuer/audience verification bound to the configured issuer.
- Routes server-side cluster check-in, ranked matchmaking, lobby coordinator WebSocket, JWKS, user profile, privilege data and map weights through that origin; routes browser cluster-registry and matchmaking requests through the bootstrapped origin.
- Adds the `/map_weights` route to the Cloudflare gateway allowlist.
- Uses Render's injected hostname and full Git SHA as fallbacks so the standalone Render service can identify itself in the upstream registry.
- Adds gateway-origin tests for API transport, WebSocket URL formation, map weights and Render host/SHA discovery.
- Fixes an incorrectly nested test case in `LobbyCoordinatorClient.test.ts`.
- Extends the browser bootstrap config type with optional `apiOrigin` and updates the `Matchmaking` test mock so it provides the new method.

Current-head CI has now passed on the branch (run `43170054796`), including the full typecheck/build, all three test shards, lint, format and generated-map consistency. No local npm result is claimed because this session does not have a network-accessible working checkout; GitHub Actions ran the repository's real CI on the PR merge ref.

The already-merged aircraft selection and map visual regression fix remains the only aircraft/map source change with a completed CI run in this report. The audit branch does not yet contain a verified end-to-end fix for the reported in-game plane selection crash, because the current live deployment is on the merged main commit and the latest browser run could not progress beyond spawn selection.

## Additional stabilization changes after the first audit pass

The integration candidate adds these security and reliability changes beyond the original audit branch:

- All HTTP API requests that carry `x-api-key` or bearer credentials now set `redirect: "error"`. This prevents a credential-bearing request from silently following an unexpected cross-origin redirect.
- `/join_verify` now uses the configured API transport origin, is included in the gateway's source allowlist, and has a regression test for gateway routing and redirect refusal. The live Worker deployment has not yet been updated with this route.
- First-time joins now fail closed when Turnstile/name verification returns an error or the verification API is unavailable. Previously admitted reconnects may retain their existing local identity during a verifier outage. Admission bookkeeping no longer marks a failed first join as admitted.
- Production starts with a fail-closed privilege checker until the first valid cosmetics/reserved-clan-tag catalog is loaded. Built-in country flags remain available, while catalog cosmetics and unverifiable clan tags are withheld. Local development retains the previous fail-open behavior; a previously loaded good catalog remains active during later API outages.
- The live Render workspace also contains a second public web service, `open-war-game.onrender.com`, started with `npm run start:server-dev` and an unrestricted `0.0.0.0/0` allowlist. Its purpose is not yet confirmed. It has not been changed because it may carry live traffic; it must be isolated or migrated after its role is confirmed.
- A browser-based live gameplay smoke test could not be started in this session because the browser automation wallet was below zero. No claim is made that the current live build was re-tested in-browser during this stabilization pass.

These changes are on Draft PR #8 and are not yet merged or deployed. The latest integrated CI run must complete before the candidate can be considered merge-ready.

## Honest completion status

The production TLS failure is confirmed from Render logs. The audit branch's source and tests now pass GitHub Actions CI, and the read-only gateway health/JWKS/registry checks passed. The live solo game starts and renders the world canvas; camera pan works and no visible browser console/network errors were reported. The test stops at the tutorial's spawn-selection step because the remote browser cannot click the canvas, so HUD, buildings, aircraft, store and multiplayer are not validated. The Render site still returns `Unknown site` from the upstream registry. No Production Render environment, service, domain or database setting was changed.
