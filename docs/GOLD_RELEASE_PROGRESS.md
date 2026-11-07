# Gold Release Progress Ledger

Last updated: 2026-11-07

This file is the durable checkpoint for the Open War **Gold** milestone. Update it after each substantive implementation or verification step so work can resume after a chat/session interruption.

## Release target

- Release name: **Gold**
- Working branch: `gold`
- Repository: `parsa2951388/OpenWar`
- Base branch: `open-war/independent-self-host`
- Base commit: `658bfad3fff1d1285f7d840114ebc49f7536651e`
- Base tree: `37dbfa4e1b9f2c4ac1919625e0853c71cf9672d3`
- The base tree is byte-for-byte the same Git tree as `open-war/aircraft-renderer-integration-2026-11` at `c456f90fe27913daeca0e8876e63a9cec94f79e2`.

## Completed research and inspection

- [x] Inspected the live OpenBattle website and its current help/menu text.
- [x] Recorded the visible systems: Solo/private lobbies, maps, nation difficulty, tribes/nations, Doomsday Clock, unit restrictions, settings, colorblind mode, performance overlay, attack ratio, leaderboard, event feed, alliances, donations, retreat, radial menu, build menu, and documented hotkeys.
- [x] Confirmed OpenBattle's Airport help text says it refuels friendly aircraft and spawns commercial flights between airports for gold. This is a UI/help claim, not independent proof of all live operational behavior.
- [x] Reviewed the existing Open War deterministic engine, WebGL renderer, client, Node/WebSocket server, map packages, tests, and release workflows.
- [x] Confirmed the current code contains `Airport` and generic `Aircraft` unit types, airport production, aircraft movement/targeting/return behavior, airport/aircraft renderer registration, and focused rendering tests.
- [x] Confirmed upstream-inspired OpenBattle experience work was merged into the self-host branch at merge commit `a8152f2e3297708947bad37a0c1a9c5601503cfc`.
- [x] Reviewed asset boundaries: repository `/resources` assets are CC BY-SA 4.0 with attribution/share-alike obligations; `/proprietary` and external CDN assets must not be copied into an independent release.

## Baseline verification

- [x] GitHub Actions run `42370101182` for commit `c456f90fe27913daeca0e8876e63a9cec94f79e2` completed successfully.
- [x] The run passed production dependency audit, typecheck, production build, all three test shards, lint, format check, generated-map check, and Docker image build.
- [x] The tested commit and Gold base commit have the identical tree SHA `37dbfa4e1b9f2c4ac1919625e0853c71cf9672d3`.
- [ ] Re-run CI on the Gold branch after Gold-specific changes.
- [ ] Run two-client multiplayer end-to-end tests against the actual self-hosted deployment.
- [ ] Verify Docker health checks with a live production-like server and workers.

## Known gaps / must not be represented as complete

- The current aviation implementation exposes generic `Aircraft` and `Airport` units. Separate functional Commercial Aircraft, Air Fighter, Stealth Fighter, Ground Attacker, and Aircraft Carrier classes have not yet been independently verified.
- The OpenBattle guide documents commercial flight revenue, but the current Open War code reviewed so far does not establish a complete commercial-flight economy with route selection, fare calculation, settlement, and lifecycle.
- The current aircraft code reviewed so far does not establish a complete player-visible fuel, range/mission planning, maintenance, or aircraft-carrier system.
- Exact OpenBattle-specific stats not confirmed by public implementation sources must remain configurable/proposed rather than being presented as verified facts.

## Live hosting inspection (2026-11-07)

- Cloudflare Pages project `open-war` exists at `https://open-war-8o2.pages.dev`; production branch is `main`.
- The latest Pages deployment record is `ab84e5f5-521b-4223-ae36-20b5aef5d706`, created 2026-11-05, with deployment stage marked successful. It is an ad-hoc deployment and its commit hash is empty, so the current record is not fully traceable to a source commit.
- External request to `https://open-war-game.onrender.com/api/health` returned HTTP 503 during this check.
- External requests to the Pages apex URL and latest deployment URL returned HTTP 429 and HTTP 502 respectively during this check.
- Therefore production multiplayer readiness is **not verified**. Do not promote Gold to production until the health endpoint, Pages proxy, workers, authentication, WebSocket path, and two-client smoke tests all pass.
- Render account shows a workspace named `My Workspace`, but no workspace was selected. Do not inspect or change Render services/deployments until the user explicitly confirms that workspace.

## Milestones

- [x] M0 — Research OpenBattle and audit the current Open War repository.
- [x] M1 — Choose a tested, self-host-oriented base and create the isolated `gold` branch.
- [ ] M2 — Close feature gaps: aviation gameplay, economy, unit lifecycle, mobile/desktop UX, settings and accessibility.
- [ ] M3 — Review security, auth, lobby and WebSocket production configuration; preserve legal notices and asset compliance.
- [ ] M4 — Re-run CI, test deterministic snapshots/replays, run browser and two-client smoke tests, and profile performance.
- [ ] M5 — Validate live hosting and rollback plan; only then promote the Gold release.
- [ ] M6 — Send the requested completion email to `jafariparsa102@gmail.com` after release readiness is verified.

## Resume instructions

1. Read this ledger first.
2. Inspect the latest commit on `gold` and update this file before starting a new work block.
3. Never deploy to the production Pages alias while the live health/proxy checks are failing.
4. Keep unverified OpenBattle aircraft behavior clearly labelled as proposed until implemented and tested.
5. After each milestone, commit the updated ledger with the source changes and test evidence.

## Current status

**Gold branch created; research, baseline checks, and hosting audit recorded. Implementation and production release are not complete.**
