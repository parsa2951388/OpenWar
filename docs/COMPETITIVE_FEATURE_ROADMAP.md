# Open War — Competitive Feature Audit and Roadmap

**Audit date:** 2026-11-06
**Compared products:** [OpenBattle.ir](https://openbattle.ir/), [OpenFront.io](https://openfront.io/), [OpenFrontIO source](https://github.com/openfrontio/OpenFrontIO), [OpenFront Wiki](https://openfront.wiki/)

This document records an implementation-oriented comparison. It distinguishes features observed on a live competitor in the 2026-11-05 inspection, code present in the Open War repository, and features whose production behavior still needs end-to-end verification. A later automated browser attempt against OpenBattle was unavailable because the browser provider account had insufficient credits; the OpenBattle details below are therefore historical observations, not a fresh 2026-11-06 verification.

## Executive summary

Open War already contains a substantial portion of the OpenFront-derived RTS foundation. Its repository includes a deterministic simulation engine, a browser client, lobby and game-server code, a single-player configuration flow, a custom Operations edition, and UI modules for inventory/cosmetics, store, clans, leaderboards, news, help, and saved games.

The key distinction is **code presence versus verified production behavior**. A component or mode existing in the repository does not prove its account flow, matchmaking, persistence, multiplayer synchronization, or live deployment is operational. On public hosts, the New/Operations edition now intentionally shows an under-construction information screen and blocks normal client entry to its online routes. The solo Operations campaign is available only on localhost/127.0.0.1 for development QA. The gate is client-side; server-side edition isolation and two-client gameplay verification remain required before enabling public New multiplayer.

## Feature comparison

| Area               | OpenBattle.ir — observed                                                                | OpenFront — documented/current                                                                     | Open War — repository evidence                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry modes        | Solo, private room create/join, ranked 1v1                                              | Solo, public FFA/team, private rooms, ranked 1v1/2v2/FFA, Clan Wars, spectator                     | GameModeSelector, SinglePlayerModal, Operations missions                                                                                              |
| Lobby setup        | Map, tribes/nations, Doomsday Clock, disabled units, start delay                        | Extensive map, bot, nation, team, alliance, timer, economy and unit-ban controls                   | Existing game configuration and single-player/lobby components; live server support needs verification                                                |
| Economy/buildings  | City, Defense Post, Port, Factory, Warship, Missile Silo, SAM, nukes; Airport is listed | City, Port, Factory/trains, Defense Post, Warship, Missile Silo, SAM, nukes, transport/trade ships | Existing core economy plus Gold Airport, defensive Aircraft and trade-partner CommercialAircraft routes; carrier and specialist aircraft roles remain future work |
| Diplomacy          | Alliances, sharing and betrayal penalties                                               | Alliances, renewal, betrayal, embargo, donations and shared vision                                 | Inherited engine systems; verify against live matches                                                                                                 |
| Maps               | World, Europe, Americas, Asia, Africa, Japan and special maps                           | 60+ documented maps and ongoing additions                                                          | Inherited map library and map-generation pipeline; map inventory should be audited separately                                                         |
| Competitive        | Ranked 1v1; 2v2 shown as coming soon                                                    | Ranked 1v1, 2v2, FFA and Clan Wars                                                                 | Leaderboard UI includes 1v1, 2v2, FFA, clans and tribes; queue/service readiness is not established by UI alone                                       |
| Social/progression | SMS account, leaderboard, match history, short-lived replays, Bale community            | Profiles, clans, XP/levels/prestige, reporting, trusted lobbies, replay viewer                     | Clan, leaderboard, profile, inventory and saved-game UI components exist; persistent account progression and live service integration need validation |
| Cosmetics          | Store shell observed; inventory availability was empty during inspection                | Territory patterns, flags, ship/weapon effects, crowns and other cosmetics                         | Inventory, cosmetics, loadout and store components exist; production catalog/payment readiness needs validation                                       |
| Onboarding         | Persian-first UI, help/download/news                                                    | Tutorial, wiki, settings and rebindable controls                                                   | Help/tutorial, news and settings components exist; translation coverage should be measured                                                            |
| Mobile             | Beta Android web app/download flow                                                      | Browser touch support, with known control gaps                                                     | Responsive UI exists; dedicated mobile touch QA and installability need a separate pass                                                               |

### OpenFront latest release snapshot (verified 2026-11-06)

The official OpenFront releases endpoint now lists **v0.35.12**, published November 6, 2026 (release notes dated November 5), as the latest release at the time of this audit. Its release note gives a high-level summary — “Improve the experience on game portals” — without itemizing the underlying changes. The immediately preceding v0.35.11 release (November 4) contains the specific social-lobby and Store updates below. Recent additions relevant to Open War include:

- A guided tutorial covering spawn, expansion, troops and first attacks (v0.35.7).
- Progression with XP, player levels, prestige, ranked FFA and Clan Wars, plus a seekable replay viewer (v0.35.0).
- Clan territory map, clan donation leaderboard and continuing public-lobby/team fixes (v0.35.7–v0.35.11).
- v0.35.12 (November 5 release notes; published November 6): high-level game-portal experience improvements; the release does not specify the individual changes.
- v0.35.11 (November 4): fixes friend groups being split across public Duos/Trios/Quads teams and adds timed sale banners, discount ribbons and crossed-out old prices in the Store.
- Current lobby options include map search/favourites, AI difficulty, FFA/Teams, tribes/nations, gameplay modifiers, unit bans and start/timer controls.

The release feed is the source of truth for current version claims; the wiki and community guides may lag behind the live client.

### OpenBattle-specific observations

- The public interface exposes solo play, private-room creation/joining and ranked 1v1. Ranked 2v2 is labelled as upcoming, not a confirmed live mode.
- During one live homepage inspection, the header displayed 691 players in match. This is a point-in-time observation, not a stable or guaranteed concurrent-player metric.
- The home screen has a tag/name field, separate skin and flag selectors, and quick-match cards for Italy FFA, Halkidiki FFA (player-only), Europe (4 teams of 22, peace timer and random spawn), and World (6 teams of 5 with starting gold).
- Solo configuration is available without signing in. Observed controls include featured/all/favourite map tabs, map search, random map, four AI difficulty levels, FFA/Teams, tribe and nation counts, instant build, random spawn, infinite gold/troops, compact map, water nukes, Doomsday Clock, match length, gold multiplier, starting gold and alliance duration.
- The solo unit-ban grid lists City, Defense Post, Port, Warship, Boat, Missile Silo, SAM Launcher, Atom Bomb, Hydrogen Bomb, MIRV, Factory, Airport, Aircraft Carrier, Commercial Aircraft, Stealth Fighter, Air Fighter and Ground Attacker. Listing a toggle does not prove that every listed aircraft is fully implemented in live gameplay.
- Settings observed include colorblind mode, graphics settings, emojis, betrayal alert frame, cursor build-cost display, left-click menu behavior, hidden names/lobby IDs, territory skins, start-on-player zoom, performance overlay and attack ratio.
- Airport appears in the build menu. Public observation does not establish that its complete gameplay mechanics are operational.
- A store section exists, but it displayed an empty-catalog message during inspection. Multiplayer/team matchmaking requires sign-in; replay/history and Android web-app/download features are advertised publicly.
- The public experience advertises SMS-based sign-in and a Persian community presence. Authenticated panel details could not be fully inspected.

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

The public-host experience is intentionally narrower than the local development preview:

- On public hosts, selecting New/Operations replaces the mode dashboard with a dedicated localized **در دست ساخت / Under construction** screen. It explains the planned online systems and offers a return to Classic.
- Public battle, create-private-room and join-room actions display an explanatory notice; they do not open matchmaking or a lobby.
- Direct navigation to lobby, detailed-view and matchmaking routes is redirected back to the edition hub. Host, join and matchmaking modal entry points are guarded, and the final `join-lobby` event is cancelled while Operations is selected on a public host.
- The Operations dashboard and solo missions are available only on `localhost` / `127.0.0.1` for development QA; they are not exposed on the public site.
- Classic online entry remains available and is not covered by the New/Operations gate. The Classic hub also surfaces existing gameplay systems so they are easier to discover.
- This is a **client-side entry gate**, not a separate Operations server protocol. Do not treat it as protection against custom clients that connect directly to the shared backend; server-side edition authorization and two-client end-to-end tests are still P0 release requirements.

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

1. Extend the Gold aviation foundation into a broader air-war system: specialist fighter/stealth/ground-attack roles, aircraft carrier logistics, player-facing flight controls and mission/maintenance rules. Preserve deterministic snapshots, configurable balance, counterplay and multiplayer synchronization.
2. Evaluate SMS/OTP authentication for users who cannot reliably use external OAuth providers. Keep provider secrets server-side and add rate limits, abuse controls and account recovery.
3. Evaluate a PWA install path and mobile-first touch controls, with real-device testing before claiming mobile readiness.
4. Consider a community announcement integration (for example, a bot that posts release notes and tournaments) only after moderation, secrets and operational ownership are defined.

### P3 — Polish and retention

1. Add original map packs and a consistent map browser with search, tags and preview thumbnails.
2. Improve replay navigation, match summaries and shareable match links.
3. Expand graphics presets, performance telemetry and accessibility options.
4. Add original cosmetic content only after catalog, purchase, ownership and refund flows are reliable.

## Airport/Air Transport design boundary

OpenBattle lists Airport, but its full working behavior could not be verified from the public interface. OpenFront's public wiki describes Airport as an abandoned prototype rather than a shipped building. Open War Gold now has an original airport implementation: a defensive aircraft per completed airport, a separate commercial-aircraft unit, deterministic partner-airport routes, distance-scaled revenue for both trading owners, fighter/SAM interception, versioned snapshots and original WebGL sprites. This does not claim feature parity with every aircraft toggle observed on OpenBattle: aircraft carriers, troop transport, specialist fighter roles, fuel/maintenance controls and live multiplayer validation remain incomplete.

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
- [OpenFront official releases](https://github.com/openfrontio/OpenFrontIO/releases)

## Open War implementation update — 2026-11-07 (Gold)

- Added a distinct Commercial Aircraft simulation unit. Each active airport can dispatch a trade-partner flight within a per-owner fleet cap; both partners receive route-scaled gold at each arrival. Flights reverse and return continuously, are saved/restored with their air-path state, and can be intercepted by fighters and SAM launchers. The renderer uses an original commercial-aircraft sprite and displays its health bar.
- Added a version-2 Airport execution snapshot with a migration from version 1. Deterministic route/revenue and snapshot round-trip tests are being added and must pass CI before release claims are made.

## Open War implementation update — 2026-11-06

The post-PR-20 parity branch now contains the following implemented work, distinct from future roadmap items:

- Validated lobby presets are connected to solo and hosted-lobby setup.
- Ally troop and gold donations have direct actions and configurable key bindings.
- The in-game graphics entry point opens a shared responsive graphics side panel.
- The Classic online battle hub reports live public and hosted room counts from the public lobby feed, with explicit connecting and unavailable states.
- The New / Operations public entry remains gated behind the existing Coming Soon maintenance screen.

The browser-facing deployment is still the independent Pages-to-Render topology documented in `docs/SELF_HOSTING.md`. A skipped upstream deploy workflow is not evidence of a new production rollout. The PR's CI and two-client production smoke tests remain the release gate.
