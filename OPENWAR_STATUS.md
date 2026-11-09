# Open War — implementation ledger

Last updated: 2026-11-09

## Baseline status

The repository is a fork of OpenFrontIO. The inherited core includes a territorial real-time strategy client, deterministic game engine, game server, map catalogue, land and naval gameplay, and browser UI. The current public static-site deployment builds the browser client. It does not yet have a dedicated Open War multiplayer API or game-server deployment.

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
