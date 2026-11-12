# Open War technical audit

Audit date: 2026-11-12  
Repository: `parsa2951388/OpenWar`  
Production URL: https://open-war-online.onrender.com/  
Production branch: `main`  
Fix branch: `claude/deep-audit-fixes`

## Scope and evidence

This audit combines source inspection, Render service/log inspection, a read-only browser smoke test, and GitHub Actions validation. It does not claim that every game feature has passed live gameplay acceptance.

The deployed Render service was running the `main` commit `1ebc119c6c6ba3e7cab028f09d164b12436d4a6a` (merge of PR #5). No Production configuration, database, Cloudflare resource, domain, secret, or deploy was changed during this audit.

## Confirmed findings

### 1. Public matchmaking is currently degraded

Render application logs repeatedly show failed lobby check-ins for 1v1, 2v2 and Clan Wars. The underlying network error is:

`ERR_SSL_SSL/TLS_ALERT_HANDSHAKE_FAILURE`

The same logs identify the running environment as `dev`. The current `start:render` script in `package.json` forces `GAME_ENV=dev` and injects development placeholder values for the API key and Turnstile key. The exact outbound API hostname is not present in the captured production logs, so the TLS failure's exact host/certificate/policy cause is not yet established.

The audit branch:
- Replaces the forced-development Render start command with a dedicated validated launcher.
- Adds explicit `API_DOMAIN` support for installations whose API is not hosted at `https://api.<DOMAIN>`.
- Rejects accidental Render development mode and invalid public API/runtime configuration without printing secret values.
- Adds safe hostname/error-code diagnostics for ranked check-ins and clears the abort timeout in `finally`.

The branch must not be deployed until the real Render settings are reviewed and a controlled staging validation confirms the correct API host, valid API key, Turnstile configuration, worker count and instance letter. No such settings were changed here.

### 2. Aircraft click crash: source fix is already live

PR #5 fixed the concrete aircraft-click exception in `src/client/controllers/FighterSelectionController.ts`. The spatial query callback receives an object shaped as `{ unit, distSquared }`; the old logic treated that wrapper as a unit. The current code reads `({ unit })`, filters by local ownership, and uses the spatial index rather than scanning and sorting every aircraft on each click.

PR #5 also added regression coverage including a 20,000-aircraft large-match scenario. PR #5 is merged into `main` and its commit is the deployed Render commit.

The live browser smoke test could not reach a playable game because the test browser did not obtain WebGL2. Therefore the source regression is fixed and deployed, but a live aircraft selection/move interaction has not been independently reproduced on a hardware-accelerated client during this audit.

### 3. World map overlays: source assets and generated manifest are present

PR #5 restored the land/water overlay layers for World, World4000 and World10000, including the WebP layer files and generated manifest entries. The audited loader path is coherent:

1. `FetchGameMapLoader` resolves layer IDs to `<id>.webp` or `<id>.4x.webp`.
2. `TerrainMapFileLoader` obtains the manifest and map files.
3. `TerrainMapLoader` propagates validated manifest layers into `TerrainMapData`.
4. `MapLayerController` loads the images and passes them to `MapRenderer`.
5. Vite's production build hashes map assets under `static/_assets`; the Render master serves that static directory.

The default Map Layers switch and per-layer visibility default are enabled. The GitHub generated-map check passes.

A failed individual layer image currently logs a warning and is skipped, allowing a match to continue with an incomplete visual overlay. No evidence from the available live request logs proves that the deployed World overlay request itself failed. The live browser test could not render a match with WebGL2, so actual map appearance, camera behaviour and mobile rendering remain unverified.

### 4. Spatial query boundary bug

The audit branch fixes inclusive UnitGrid bounds. The previous cell interval could omit a unit exactly at the allowed range when that unit was across a 100-tile cell boundary. Regression cases cover both horizontal and vertical boundaries, including `nearbyUnits` and `hasUnitNearby`.

### 5. Map image memory lifecycle

MapRenderer retains decoded `ImageBitmap` objects so it can rebuild textures after WebGL context restoration. Before this audit fix, the bitmaps were not explicitly closed when layers were replaced or a game was disposed. A pending image could also resolve after the game was aborted and remain unclosed.

The audit branch now:
- Keeps the active image set through WebGL context loss/restoration.
- Closes replaced images after a successful layer-set upload, while retaining reused images.
- Closes active images on final renderer disposal.
- Closes images that finish loading after the game has been aborted.

Regression tests cover context restoration, replacement, final disposal and aborted image loading.

### 6. Incomplete product surfaces

The live Clans navigation reports `Clans coming soon`; this screen is not an implemented clan-management feature in the current deployment. The browser smoke test also observed a generic `vx.xx.xx` version label. The audit branch uses the Render deploy commit for the version identity, but this is not live.

## Automated validation

GitHub Actions run: https://github.com/parsa2951388/OpenWar/actions/runs/43162374366

On commit `2a745d755393105b401a20d3e64686cb47e6156f` the run completed successfully:
- Build and TypeScript checks: success.
- Lint: success.
- Format check: success.
- Generated map files up to date: success.
- Three test shards: 11,022 tests passed and 1 skipped (734 passing test-file executions across the three shards).
- Aircraft rules and worker parity tests: passed.
- Aircraft execution snapshot test: passed.
- UnitGrid boundary tests: passed.
- MapRenderer context-loss tests: 6 passed, including bitmap retention/release.
- MapLayerController tests: 3 passed, including aborted image cleanup.

The current branch has one subsequent commit, `9e7ce2852b36f069bf97683fa9ff67103fdc51f1`, correcting loopback-host recognition for `API_DOMAIN` and adding a test. The successful run above predates that final small commit; the final head must receive its own CI run before the PR is treated as fully validated.

The npm audit report from the same workflow found 17 fix-available advisories: 4 critical, 7 high and 6 moderate. Direct vulnerable dependencies include `concurrently`, `dompurify`, `compression`, `vite`, `zod`, `vitest`, `@vitest/coverage-v8` and `@vitest/ui`. Transitive advisories include `proxy-addr`, `shell-quote`, `ip-address`, `undici`, `body-parser`, `brace-expansion`, `source-map-js`, `qs` and `@vitest/mocker`. These require a separate lockfile remediation and compatibility test cycle; no dependency upgrade is claimed by this PR.

## Live test limitations

The browser smoke test confirmed that the site wakes, renders the lobby UI, opens Settings and Solo configuration, and displays the map picker. After `START GAME`, the test browser did not reach a game canvas. The test environment could not obtain WebGL2, so this result cannot distinguish a client hardware/WebGL limitation from a production startup problem.

The following could not be verified live:
- Aircraft selection, movement and attack in a hardware-accelerated match.
- In-game map layers, camera movement and territory rendering.
- Gameplay economy, building prices, attack and AI behaviour over a full match.
- Store transactions and authenticated account flows.
- Two independent browser clients / real multiplayer.
- Physical Android/iOS touch behaviour and desktop GPU performance.
- Long-session CPU, memory and frame-time behaviour.

No credentials or purchases were used in the smoke test.

## Release decision

PR #6 is a Draft and must remain unmerged until:
1. CI has passed on the current PR head.
2. Render's actual API host and required runtime configuration are reviewed without exposing secrets.
3. A controlled staging test confirms lobby check-ins and real multiplayer.
4. A hardware-accelerated desktop browser completes a full solo match and the aircraft selection/movement regression.
5. Mobile touch, map overlays, and a second-client multiplayer acceptance test pass.

The live Render service and `main` branch were not changed by this audit.
