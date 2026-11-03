# Open War — UX, Visual and Product Audit

**Audit date:** 2026-11-03  
**Production URL:** https://open-war-8o2.pages.dev/  
**Repository:** https://github.com/parsa2951388/OpenWar  
**Comparison references:** https://openfront.io/ and https://openbattle.ir/  
**Implementation branch:** `open-war/ui-polish-2026-11-03`  
**Pull request:** https://github.com/parsa2951388/OpenWar/pull/4

## Scope and evidence

This audit combines:
- Live desktop-browser inspection of the Open War homepage and the OpenFront and OpenBattle homepages.
- A read-only health check of the Open War Pages proxy and upstream game server.
- A single-player smoke test using the default World map.
- Review of the Open War client, server-rendered app shell, asset manifest, localization dictionaries, repository README and self-hosting documentation.

No public/private multiplayer lobby was created or joined. No account was registered, no purchase was attempted and no persistent player settings were changed.

## Current Open War findings

### Strengths observed

- The game loads in a desktop browser and the homepage reaches its interactive state.
- The main page already uses a strong hierarchy: a featured FFA lobby, an upcoming-lobbies column, and clearly separated Solo, Tutorial, Create Lobby, Ranked and Join Lobby actions.
- The map picker exposes multiple featured and special maps.
- Open War has a distinct dark/navy, blue and gold visual palette, a hex-grid motif and original Open War wordmark/mark artwork.
- The solo match starts successfully using the default World map.
- The World map rendered with green/brown land, deep-blue water, visible hex-grid treatment, country borders and point-of-interest icons. No broken texture or map asset was observed during the smoke test.
- Initial in-game HUD controls were visible: menu/back, timer, playback controls, settings and fullscreen. The tutorial prompt and its Skip/Close controls were readable.
- Persian translation coverage is strong: the flattened English dictionary contains 2,631 keys and the Persian dictionary contains 2,637, with no missing Persian keys at the time of inspection. The runtime language selector sets document direction based on the selected script.

### Issues found in the source

1. **Brand consistency:** the mobile navigation still referenced the OpenFront wordmark and alt text, while desktop navigation used Open War branding.
2. **Mobile/seasonal background branding:** the server-rendered shell injected upstream OpenFront/OF logo assets for mobile and seasonal desktop background treatments instead of the project's original mark.
3. **Install identity:** the web-app manifest still named the installed app `OpenFront.io` / `OpenFront`, despite the product and page being Open War.
4. **Favicon asset:** the shell already requested `images/Favicon.svg`, but that source asset was absent from the repository tree. The original Open War mark is now supplied at that path.
5. **Version label:** the empty navigation version on an untagged build is intentional in the current implementation. `resources/version.txt` contains a placeholder and `taggedGameVersion()` only displays a tagged release version; the full commit identity is intended for the footer. This was not treated as a rendering defect.
6. **Standalone feature contract needs verification:** the codebase contains clan, inventory and payment UI modules, while the self-hosting guide states that standalone mode does not provide hosted clans, purchases or paid cosmetics. Those capabilities should not be advertised as operational until their backing services have been verified on the live standalone server.
7. **Global map label density:** at World-map zoom, no explicit country/city text labels were visible; points of interest appeared as icons. This may be appropriate at that scale, but label visibility should be tested at country and local zoom levels before changing the map renderer.

### Runtime observations

- `/api/health` returned `status: ok` for the Pages proxy/upstream game service at inspection time.
- A healthy HTTP endpoint does not establish that guest identity, matchmaking, WebSocket transport, reconnect or a two-client multiplayer match are healthy.
- The single-player smoke test reached the World map and rendered the initial map/HUD without broken assets. The first attempt stopped at the 22-step tutorial; active building/attacking after skipping the tutorial was not yet verified at the time of this report.
- The initial visual audit was desktop-only. A full mobile-device, screen-reader, keyboard-only and physical-device install audit remains outstanding.
- FPS, frame-time variance, memory, WebSocket latency, Lighthouse/Core Web Vitals and concurrent-player capacity were not measured. No performance figures are inferred from appearance or from the health endpoint.

## Competitive comparison

| Area | OpenFront | OpenBattle | Open War |
|---|---|---|---|
| Lobby presentation | Featured lobby with an upcoming-lobbies sidebar | Compact grid of multiple lobby cards | Already uses the featured-lobby + upcoming-lobbies structure |
| Lobby information | Map, mode, players, countdown and modifiers | Map, mode, players, countdown and more prominent modifier/status tags | Core map/mode/player lobby presentation exists; keep adding statuses only when data is available |
| Primary actions | Solo, Tutorial, Create Lobby, Ranked, Join Lobby | Solo, Create Lobby, Ranked, Join Lobby | All five actions already exist |
| Personalization | Account/tag, inventory and cosmetics | Skin and flag selection | Inventory/cosmetic code exists; standalone availability must be confirmed |
| Social/competitive | Leaderboard, clan surfaces, account features | ELO, clan surface and settings | Ranked/leaderboard/clan code exists; backend availability must be verified |
| Accessibility/settings | Help, settings, alert and replay-related controls | Colorblind mode, performance overlay and additional visual settings | Existing settings include alert frame, snap-build preview, hidden names, lobby alerts, help messages and attack-ratio controls |

### Concepts worth adopting

- Keep OpenFront's focused featured-lobby hierarchy; Open War already implements it well.
- Use OpenBattle's clearer modifier/status badges on lobby cards where the backend supplies the values.
- Treat player count, in-match count, ELO and matchmaking status as live data, not static decorative numbers.
- Consider dedicated skin/flag personalization only after the standalone identity, inventory and persistence services are confirmed.
- Continue to prioritize a readable battlefield over decorative animation. Add information density only where it improves decisions.

No OpenFront/OpenBattle proprietary artwork or private assets were copied. The changes use original Open War artwork already in the repository and preserve the existing upstream attribution and licensing notices.

## Changes in this implementation branch

- Mobile navigation now uses `OpenWarLogo.svg` and the accessible name “Open War”.
- Mobile background treatment now uses the original `OpenWarMark.svg`; the seasonal desktop treatment uses `OpenWarLogo.svg`.
- The web-app manifest now identifies the installed app as “Open War”, uses the original Open War mark and applies matching dark theme/background colors.
- Added `resources/images/Favicon.svg` using the original Open War mark for the favicon path already referenced by the app shell.
- The navigation version label now uses the registered “Open War” font family.

These changes are branding and entry-surface corrections. They deliberately do not alter the deterministic simulation engine, balance, lobby protocol, authentication, WebSocket server or multiplayer rules.

## Prioritized follow-up work

1. **Production multiplayer verification:** test guest-token creation/refresh, public lobby discovery, create/join/cancel, WebSocket upgrade, reconnect and a complete match with two independent browser contexts through the Pages hostname.
2. **Standalone capability truthfulness:** reconcile the self-hosting guide with the live availability of clans, inventory, store, purchases and progression. Hide or label unavailable actions honestly; do not create non-functional menu controls.
3. **Mobile and RTL pass:** capture 360/390px portrait, 844px landscape and tablet layouts; verify touch target size, nav drawer, map controls, Persian shaping, mixed-direction usernames and map-card overflow.
4. **Battlefield legibility:** test territory labels at global, regional and local zoom; preserve readable borders and selected/ally/enemy states; ensure HUD overlays never block critical map input.
5. **Accessibility:** perform keyboard and screen-reader tests, verify contrast and focus states, and add a reduced-motion strategy that does not hide critical gameplay alerts.
6. **Performance baseline:** record client bundle transfer, map asset transfer, first interactive time, frame stability and memory on a documented desktop and lower-end mobile device. Add real field metrics only when telemetry is configured and privacy-reviewed.
7. **Release gate:** run typecheck, production build, full tests, lint, formatting, map consistency, Docker/readiness validation and two-client E2E on the exact production commit.

## Release status

This branch is a reviewable change set, not a production release. A green health endpoint and successful solo-map render are not substitutes for CI, mobile verification or two-client multiplayer validation. The existing production URL should remain in service until the release gates pass and the actual game-server deployment is verified.
