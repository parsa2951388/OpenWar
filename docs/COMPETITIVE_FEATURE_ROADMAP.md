# Open War — Competitive Feature Audit and Roadmap

**Audit date:** 2026-11-05  
**Compared products:** [OpenBattle.ir](https://openbattle.ir/), [OpenFront.io](https://openfront.io/), [OpenFrontIO source](https://github.com/openfrontio/OpenFrontIO), [OpenFront Wiki](https://openfront.wiki/)

This document records an implementation-oriented comparison. It distinguishes features observed on a live competitor, code present in the Open War repository, and features whose production behavior still needs end-to-end verification.

## Executive summary

Open War already contains a substantial portion of the OpenFront-derived RTS foundation. Its repository includes a deterministic simulation engine, a browser client, lobby and game-server code, a single-player configuration flow, a custom Operations edition, and UI modules for inventory/cosmetics, store, clans, leaderboards, news, help, and saved games.

The key distinction is **code presence versus verified production behavior**. A component or mode existing in the repository does not prove its account flow, matchmaking, persistence, multiplayer synchronization, or live deployment is operational. The active Operations preview should therefore be treated as a controlled preview until two-client gameplay, authentication, and service health are verified.

## Feature comparison

| Area | OpenBattle.ir — observed | OpenFront — documented/current | Open War — repository evidence |
|---|---|---|---|
| Entry modes | Solo, private room create/join, ranked 1v1 | Solo, public FFA/team, private rooms, ranked 1v1/2v2/FFA, Clan Wars, spectator | GameModeSelector, SinglePlayerModal, Operations missions |
| Lobby setup | Map, tribes/nations, Doomsday Clock, disabled units, start delay | Extensive map, bot, nation, team, alliance, timer, economy and unit-ban controls | Existing game configuration and single-player/lobby components; live server support needs verification |
| Economy/buildings | City, Defense Post, Port, Factory, Warship, Missile Silo, SAM, nukes; Airport is listed | City, Port, Factory/trains, Defense Post, Warship, Missile Silo, SAM, nukes, transport/trade ships | Core OpenFront-derived building/economy engine; no Airport/AirTransport unit found in the inspected unit definitions |
| Diplomacy | Alliances, sharing and betrayal penalties | Alliances, renewal, betrayal, embargo, donations and shared vision | Inherited engine systems; verify against live matches |
| Maps | World, Europe, Americas, Asia, Africa, Japan and special maps | 60+ documented maps and ongoing additions | Inherited map library and map-generation pipeline; map inventory should be audited separately |
| Competitive | Ranked 1v1; 2v2 shown as coming soon | Ranked 1v1, 2v2, FFA and Clan Wars | Leaderboard UI includes 1v1, 2v2, FFA, clans and tribes; queue/service readiness is not established by UI alone |
| Social/progression | SMS account, leaderboard, match history, short-lived replays, Bale community | Profiles, clans, XP/levels/prestige, reporting, trusted lobbies, replay viewer | Clan, leaderboard, profile, inventory and saved-game UI components exist; persistent account progression and live service integration need validation |
| Cosmetics | Store shell observed; inventory availability was empty during inspection | Territory patterns, flags, ship/weapon effects, crowns and other cosmetics | Inventory, cosmetics, loadout and store components exist; production catalog/payment readiness needs validation |
| Onboarding | Persian-first UI, help/download/news | Tutorial, wiki, settings and rebindable controls | Help/tutorial, news and settings components exist; translation coverage should be measured |
| Mobile | Beta Android web app/download flow | Browser touch support, with known control gaps | Responsive UI exists; dedicated mobile touch QA and installability need a separate pass |

### OpenBattle-specific observations

- The public interface exposes solo play, private-room creation/joining and ranked 1v1.
- Ranked 2v2 is labelled as upcoming, not a confirmed live mode.
- Airport appears in the build menu. Public observation does not establish that its complete gameplay mechanics are operational.
- A store section exists, but it displayed an empty-catalog message during inspection.
- The public experience advertises SMS-based sign-in, a Persian community presence, replay/history features and an Android web-app/download path. Authenticated panel details could not be fully inspected.

### OpenFront-specific systems worth retaining or validating

- Public FFA and team games, private lobbies, spectator mode and ranked 1v1/2v2/FFA/Clan Wars.
- Large map library, map-size-aware lobby sizing, and configurable lobby rules.
- Economy and military systems: cities, ports, trade ships, factories, trains, defense posts, warships, missile silos, SAM launchers and nuclear weapons.
- Diplomacy, alliances, donations, embargoes, Doomsday Clock, AI diplomacy and terrain-aware combat.
- Profiles, clans, leaderboards, progression, cosmetics, reporting/trust controls and replay tooling.
- Performance and accessibility settings, including graphics controls and WebGL2 capability handling.

## Verified Open War code surface

The inspected active Operations branch contains the following relevant modules:

- src/client/components/EditionHub.ts — Classic/Operations edition switch, Operations dashboard and mission launch flow.
- src/client/GameModeSelector.ts — public lobby discovery and game-mode entry points.
- src/client/SinglePlayerModal.ts — configurable solo game setup and saved-game integration.
- src/client/LeaderboardModal.ts — 1v1, 2v2, FFA, clan and tribe leaderboard tabs.
- src/client/ClanModal.ts — clan browsing and management UI.
- src/client/Store.ts, src/client/InventoryModal.ts and cosmetics/loadout components.
- src/client/HelpModal.ts, src/client/components/NewsBox.ts and src/client/SavedGamesPanel.ts.

These are repository-level findings, not a claim that every service behind them is live or production-ready.

## Current Operations preview behavior

The Operations/New edition is being kept separate from Classic while its online multiplayer path is unfinished:

- Public battle browsing, private-room creation and room joining display a localized **Under construction** notice and do not open an online lobby.
- Solo Operations missions remain available.
- The Operations dashboard exposes quick access to custom solo setup, commander loadout/cosmetics and the field manual.
- Classic online entry points are intentionally outside this gate and are not changed by this feature.

## Prioritized implementation roadmap

### P0 — Safe preview and operational proof

1. Keep Operations online entry points gated until the service is ready.
2. Run CI, browser smoke tests and a two-client end-to-end multiplayer test against the exact deployed commit.
3. Verify auth issuance/refresh, WebSocket upgrade/origin checks, lobby creation/joining, worker routing, reconnect and graceful failure.
4. Verify production secrets and environment separation; never expose development identity shortcuts in a public deployment.
5. Audit the production bundle for prohibited upstream assets and confirm all required notices and source disclosures.

### P1 — Competitive systems that can be enabled from existing code

1. Validate ranked 1v1/2v2/FFA matchmaking and the corresponding leaderboard data path.
2. Validate clan membership, clan queues/teams and clan leaderboard updates.
3. Verify profile persistence, match history and replay availability.
4. Complete the progression design (XP, levels, milestones and cosmetic rewards) only after persistent identity and server-side validation exist.
5. Audit map parity and add original regional maps where there is a clear player benefit.

### P2 — OpenBattle-inspired differentiation

1. Add an independently designed Airport/Air Transport system. This must be a complete simulation feature, not a decorative building: placement rules, cost, aircraft lifecycle, route/path behavior, troop capacity, interception/counterplay, serialization, rendering, AI behavior and deterministic tests all need implementation.
2. Evaluate SMS/OTP authentication for users who cannot reliably use external OAuth providers. Keep provider secrets server-side and add rate limits, abuse controls and account recovery.
3. Evaluate a PWA install path and mobile-first touch controls, with real-device testing before claiming mobile readiness.
4. Consider a community announcement integration (for example, a bot that posts release notes and tournaments) only after moderation, secrets and operational ownership are defined.

### P3 — Polish and retention

1. Add original map packs and a consistent map browser with search, tags and preview thumbnails.
2. Improve replay navigation, match summaries and shareable match links.
3. Expand graphics presets, performance telemetry and accessibility options.
4. Add original cosmetic content only after catalog, purchase, ownership and refund flows are reliable.

## Airport/Air Transport design boundary

OpenBattle lists Airport, but its working behavior could not be verified from the public interface. OpenFront's public wiki describes Airport as an abandoned prototype rather than a shipped building. Open War should not copy a hidden implementation or imply compatibility with one. A differentiated Open War implementation should define its own balance and mechanics, then ship only after deterministic engine tests and multiplayer synchronization tests pass.

## Licensing and attribution

Open War is an OpenFront-derived fork. Before reusing or modifying upstream material:

- Treat the game code as AGPL-3.0 and meet the network-source availability obligations for deployed modifications.
- Treat /resources assets under their stated CC BY-SA 4.0 terms and preserve attribution/share-alike requirements.
- Do not copy /proprietary assets, CDN-hosted assets, database-delivered premium assets, sounds or music that are not licensed for reuse.
- Keep the required OpenFront attribution notices and any applicable “Based on OpenFront” notice.
- Use independently designed UI, original artwork and independently implemented mechanics for Open War-specific differentiation.

## Source links

- [OpenBattle live game](https://openbattle.ir/)
- [OpenFront live game](https://openfront.io/)
- [OpenFrontIO source repository](https://github.com/openfrontio/OpenFrontIO)
- [OpenFront Wiki](https://openfront.wiki/)
- [OpenFront licensing notes](https://github.com/openfrontio/openfront-verified/blob/main/LICENSING.md)
