# Open War — implementation ledger

Last updated: 2026-11-10

## Baseline status

The repository is a fork of OpenFrontIO. The inherited core includes a territorial real-time strategy client, deterministic game engine, game server, map catalogue, land and naval gameplay, and browser UI.

### Deployment and smoke-test results (2026-11-09)

- [x] Public Node game service deployed at https://open-war-online.onrender.com/.
- [x] Render starts the Master process and one Worker.
- [x] Master listens on the managed Render PORT.
- [x] HTTP routes under `/wN/*`, random game-creation HTTP routes, and WebSocket upgrades are proxied to the selected Worker.
- [x] Server-rendered EJS page injects BOOTSTRAP_CONFIG; the static-only blank-page deployment was retired.
- [x] Browser smoke test: title and complete lobby UI render; controls respond.
- [x] SOLO smoke test: WORLD map opens, a spawn point is selected, the player enters the active match, and the timer/HUD advance.
- [ ] Multiplayer acceptance test with two independent browser clients.
- [ ] Independent Open War account/authentication API and production cluster/server registry.
- [ ] Production Turnstile, OAuth, and persistent-account configuration.
- [ ] Desktop and mobile compatibility tests beyond the current browser smoke tests.

The current Render service uses the upstream development-mode compatibility profile and one Worker. The client and game server are deployed, but this is **not** a complete production multiplayer backend or account system. Do not describe public matchmaking, OAuth, or two-client multiplayer as verified.

## Verified progress in the performance/air-rules branch

- [x] Shared in-flight terrain-map loading: concurrent callers reuse one map build, and failed loads are evicted so a later attempt can retry.
- [x] Low-end graphics preset: simplified terrain palette, reduced highlight work, structure dots, and expensive glow/fallout effects disabled.
- [x] Pure aircraft-rule foundation added under `packages/engine/src/aircombat/AircraftRules.ts`: direct flight distance, round-trip fuel with reserve, safe fuel consumption, base-only refuelling and repair, damage/destruction, stealth detection, commercial-aircraft non-combat rules, flight duration, and carrier launch eligibility.
- [x] Focused regression tests: 11 graphics-preset tests and 12 aircraft-rule tests pass.
- [x] `npm run typecheck` passes after these additions.

**Important boundary:** these are performance changes and aircraft domain rules only. There are still no airport/aircraft `UnitType` values, airport placement/build menu, aircraft mission intents/executions, synchronized aircraft state, or playable aircraft in a match. Air-combat gameplay remains unimplemented.

## Air-combat expansion — NOT IMPLEMENTED

The following features are requirements, not completed features:

1. Airport building, placement validation, production/refuel service and a dedicated airport symbol.
2. Commercial aircraft with routes and visible flight state.
3. Air Fighter, Stealth Fighter and Ground Attacker with distinct roles, stats, costs and attack behavior.
4. Aircraft assignment directly to targets or missions without forcing the player through an awkward airport sub-menu.
5. Aircraft carrier with embarked squadrons, launch/recovery, movement and carrier survivability.
6. Fuel consumption, operational range, refuel rules, repair/rearm cycle and return-to-base behavior.
7. Air-to-air combat, air-to-ground attacks, target selection and SAM/air-defence counterplay.
8. Multiplayer-authoritative simulation, serialization, reconnection, replay compatibility and synchronized UI.
9. Desktop/mobile HUD, touch input, readable unit icons, tooltips, balance and performance validation.
10. Automated tests for movement, range, fuel depletion, carrier loss, refuelling, target validation, combat and server/client state parity.

## Release gates

- [ ] Air unit and airport rules implemented in the authoritative engine.
- [ ] New state added to engine API, snapshots, packed updates and replay compatibility.
- [ ] UI build menu, icons and aircraft controls implemented.
- [ ] Tests pass for engine, client and server.
- [ ] Full production build passes.
- [ ] A dedicated game server and required API/authentication endpoints are deployed.
- [ ] Two independent browser clients complete a real multiplayer test.
- [ ] Mobile and desktop gameplay checks pass.
- [ ] Public source and upstream attribution remain available under AGPL-3.0.

## Source provenance

- Upstream project: https://github.com/openfrontio/OpenFrontIO
- Upstream source license: GNU AGPL v3 (see `LICENSE`).
- Upstream asset rules: see `LICENSE-ASSETS`; `/resources` assets are CC BY-SA 4.0, while `/proprietary` and external assets are not licensed for independent reuse.
- Open War repository: https://github.com/parsa2951388/OpenWar

Do not mark an item complete until its implementation and relevant tests are present in this repository.

## Aircraft implementation and validation (2026-11-10)

- [x] Added airport, commercial aircraft, aircraft carrier, Air Fighter, Stealth Fighter and Ground Attacker engine types and UI/build-menu entries.
- [x] Added deterministic fighter movement, fuel/range/service rules, carrier/airport refuelling, patrol and ground-attack execution.
- [x] Added Worker-style Shell-based air-to-air missile execution, flare evasion, target reservation/release and fighter bomb area damage.
- [x] Added commercial-aircraft spawning, trade-route destination selection, capture and gold-revenue events.
- [x] Added aircraft sprites/icons, renderer unit mappings, network updates and execution snapshot registration.
- [x] Corrected translation ordering, message severity mappings, engine Math-layer boundary and Open War JSON-LD title test.
- [x] npm run typecheck passed.
- [x] Focused regression suite passed: 68 tests across 7 test files, including aircraft parity, rendering boundary, message classes, translation order and server HTML rendering.
- [x] git diff --check passed.
- [x] npm run build-prod passed; Vite emitted static production assets and asset-hashes.json (2,438 files; core hash 73ef754a9931).
- [ ] Full npm test was attempted but did not finish within the sandbox execution window; it was stopped. Do not mark the entire suite as passing based on the focused run.
- [ ] Two-browser multiplayer acceptance test remains outstanding.
- [ ] The newly built aircraft update is not yet live on Render. The public Render service still serves the previously deployed main commit until this branch is merged and deployment completes.

The production build reports non-fatal inherited CSS host-context warnings and a large-chunk warning. These did not prevent the build from completing.
