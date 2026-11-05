# Open War — Independent Product Blueprint

**Status:** Product and architecture proposal  
**Baseline:** main at 6f4a9eb487ac980129a6a153e343f76e772c7253  
**Scope:** Product identity, UX, gameplay differentiation, accounts, multiplayer, graphics, localization, quality and Iran-first hosting.  
**Important:** This is a proposal and source-level audit. It does not claim that these improvements have been implemented or browser-tested.

---

## 1. Product direction

Open War should become an original **theatre-scale strategy and command game**, not a visual reskin of OpenFront or OpenBattle.

**Product promise:** Plan the campaign. Secure the supply lines. Control the intelligence picture. Win the theatre.

Territory remains important, but victory should emerge from logistics, intelligence, objectives, diplomacy and operational decisions—not only from expanding coloured borders.

### Product principles

1. Strategic clarity over visual noise.
2. Originality over imitation: do not reproduce another game's lobby composition, card layout, icon language, animations, map art or copy.
3. Fair competition: no paid combat advantage or pay-to-win progression.
4. Low-friction entry: let a new player try an operation quickly, then secure an account to keep progress.
5. Iran-first resilience: core gameplay must not require a foreign CDN, identity provider, anti-bot vendor, analytics collector or payment API.
6. Performance is part of the design, especially on mid-range Android devices and older PCs.

## 2. Current source-level audit

The repository already contains substantial functionality. The programme should build on it rather than replace it.

### Existing foundations confirmed in the repository

- TypeScript client and Node.js server.
- Deterministic simulation split across engine, engine API, engine library and shared packages.
- WebGL2 renderer with a frame builder and rendering passes.
- Simulation worker separated from the render loop; renderer documentation describes simulation at roughly 10 Hz and drawing at up to 60 FPS.
- HTTP API, game WebSocket transport, lobby WebSocket, public lobby scheduling and worker management.
- Lobby creation, private joining, matchmaking and server discovery.
- Reconnection attempts, ping loop, schema validation and server-side rate limiting.
- Desync hashes and consensus mechanisms.
- Graphics presets, advanced settings and map-layer controls.
- Persian translations, RTL-aware CSS and direction handling for identifiers.
- Clans, friends, profiles, progression, cosmetics, leaderboards, replays and extensive simulation tests.

### Important limitations confirmed in code and docs

| Area | Current baseline | Consequence |
|---|---|---|
| Standalone identity | Independent Ed25519 guest tokens | Guests can play, but do not yet have recoverable full accounts |
| Refresh sessions | Stateless 30-day refresh token in standalone mode | Individual token revocation and device/session management are missing |
| Account providers | Standalone guest API does not provide OAuth, password sign-in or account linking | A local account and recovery service is needed |
| Persistence | Minimal guest profile | Durable accounts, ratings, match history and progression need a self-hosted data service |
| Simulation authority | Simulation runs on clients; server relays ordered intents | Hash consensus detects disagreement but is not equivalent to authoritative ranked simulation |
| External services | Code supports API/CDN/Turnstile/telemetry integrations | Domestic deployment must remove hard dependencies on unreachable services |
| Localization | Persian has broad key coverage but some strings retain upstream names and URLs | Full product-specific terminology and copy audit is needed |
| Runtime verification | Production Docker build and health endpoint have passed previously | Full auth-to-match two-client E2E and reconnect tests remain required |

This is a source-level review, not a complete interactive browser audit. The visual proposals require screenshot-based review and usability tests on desktop, tablet and phone before implementation.

## 3. Original visual identity: Atlas Command

Recommended art direction: premium strategic cartography inspired by topographic atlases, field-operation boards and mission-control software. It must not resemble the familiar neon-glass battle-royale lobby.

**Visual language**
- Deep graphite and charcoal command surfaces.
- Warm map-paper and stone tones for cartographic layers.
- Muted teal for friendly control, vermilion for hostile control, amber for contested objectives and neutral slate for unknown territory.
- Fine contour lines, terrain relief, elevation shading, route markings and operational grid references.
- Restrained illumination on critical actions only.
- Original operation insignias, map illustrations, typography and sound identity.

**Avoid**
- Copying OpenFront/OpenBattle landing layout, card proportions or map picker.
- Reusing upstream logos or proprietary assets.
- Making generic cyberpunk neon the entire art direction.
- Permanent glowing borders, hover-only controls and distracting animation.
- Communicating friendly/enemy state by colour alone.

### Design system

Define shared tokens before polishing components:
- Colour roles for surfaces, borders, text, friendly, hostile, neutral, contested, warning, critical and success.
- A 4 px spacing rhythm and named spacing tokens.
- Consistent radii, elevation and typography roles.
- Numeric and monospace styles for tactical data and codes.
- Motion tokens: 100 ms micro-feedback, 180 ms standard transition, 280 ms modal transition.
- Comfortable and compact density presets.
- A global reduced-motion setting.

### Original icon family

Create a custom SVG set on a 24-unit grid with consistent stroke weight and optical alignment. Cover operations, theatres, logistics, depots, intelligence, recon, radar, diplomacy, research, objectives, air, land, sea, alerts, reports, roles and connection states. Every icon-only control needs an accessible name. Use shape, line and text as well as colour.

## 4. UX and information architecture

The home page should be an **operations dashboard**, not a row of generic mode cards.

### Proposed navigation

1. Operations — featured operation, active battles and quick entry.
2. Campaign — structured solo and co-op missions.
3. Multiplayer — public operations, ranked seasons and private rooms.
4. Career — record, mastery, achievements and match history.
5. Workshop — maps, scenarios and favourites.
6. Community — friends, groups, clans, announcements and support.
7. Profile — identity, security, appearance and preferences.

Do not show future features as if they already work. Planned features must be clearly labelled.

### Operations dashboard

- Featured operation with original map art and a concise mission brief.
- One-click practice/quick-match action.
- Live operation listings with map, objective type, estimated duration, player count, region and measured ping.
- Separate status for internet, API, lobby and game-socket connectivity.
- Recent match, career progress and friends online.
- Local announcements and maintenance notices.
- Mobile-first vertical hierarchy, large touch targets and safe-area support.

### Guided lobby setup

1. Mission: objective set, mode and competitive rules.
2. Theatre: map, scale, terrain profile and preview.
3. Forces: teams, player cap, AI profile and optional roles.
4. Rules: resources, pace, visibility, supply and diplomacy.
5. Review: match summary, expected duration and invite privacy.

Advanced options should be grouped behind clear explanations. Explain what a setting changes, not just what its switch does.

### In-game command interface

**Desktop**
- Top: phase, timer, objective score, latency and match state.
- Left: objectives, task tree and selected force.
- Right: roster, diplomacy, intelligence and event feed.
- Bottom: contextual command dock and shortcuts.
- Keep the map dominant; avoid covering front lines by default.

**Mobile**
- Bottom command rail for common actions.
- Contextual bottom sheet for unit, territory and objective details.
- Thumb-reachable controls and safe areas.
- No hover-only actions.
- Predictable pinch zoom, pan and tap selection.
- Optional simplified HUD for small screens.

### Settings

Build a searchable settings centre: gameplay, controls, display, graphics, audio, accessibility, privacy, language and network. Explain each option, preview where useful, distinguish immediate from restart-required changes, and provide section-level reset. Include Auto, Performance, Balanced and Quality presets with surfaced values in advanced settings.

## 5. Differentiating gameplay systems

Introduce mechanics in phases. Do not ship all new systems at once.

### Supply and logistics — signature mechanic

- Depots, logistics hubs, ports, rail/road corridors and forward supply points.
- Units beyond supported supply receive clear, predictable penalties.
- Convoys create escort and interception objectives.
- Players can repair, reroute, escort, disrupt or capture infrastructure.
- Dedicated map layer for coverage, bottlenecks and severed routes.
- Deterministic, data-driven rules configurable by game mode.

### Intelligence and reconnaissance

- Fog of war by mode.
- Recon units, radar stations and intelligence objectives.
- Reports show age and confidence, not only visible/hidden.
- Decoys and misinformation are limited, counterable and clearly signalled when detected.
- Scouting provides actionable information without filling the HUD with noise.

### Theatre objectives and victory

Support multiple victory conditions:
- Hold command centres.
- Secure a chain of strategic locations.
- Escort or intercept a convoy.
- Maintain supply to a critical region.
- Control key infrastructure for a duration.
- Complete a multi-stage mission.

Keep simple elimination as one mode, not the whole product identity.

### Doctrine and research

In-match doctrine choices should have meaningful trade-offs: logistics, reconnaissance, defensive engineering, mobility or economic development. Competitive power must not be purchased with money.

### Team roles and co-op

Optional roles: Commander, Logistics, Recon, Operations and Naval/Air liaison. Roles should remain optional and balanced so small parties are viable.

### Campaign and scenario layer

- Solo missions with authored objectives and difficulty levels.
- Co-op operations against AI.
- Weekly community operations.
- Scenario editor for maps, objectives, rules and AI setup.
- Curated and moderated scenario publishing.

### After-action review

Every match should produce an objective summary, event timeline, territory and supply progression, major decisions, losses and recoveries, team contribution and replay/event-log playback where available. The report should teach players something, not just show a victory screen.

### Career and progression

Use skill rating by mode, seasonal non-pay-to-win achievements, mastery by role/doctrine/map/objective and cosmetic insignias, banners, profile backgrounds and emotes. Provide profile privacy settings and transparent rating resets.

## 6. Authentication and account security

Keep guest-first entry, but allow a guest identity to be upgraded to a durable account without losing match history.

Required capabilities:
- Local username/password with Argon2id password hashing.
- Optional email or phone verification using a domestic provider.
- Recovery codes and secure account recovery.
- Optional TOTP MFA for players; mandatory MFA for administrators.
- Device/session inventory, individual revocation and sign-out everywhere.
- Refresh-token rotation backed by server-side token records.
- Explicit account linking with collision handling.
- Rate limits and risk-based challenges on sensitive actions.
- Public player ID separated from email and phone.
- Data export and deletion.

Use short-lived access JWTs, hashed rotating refresh-token records, secure HttpOnly SameSite cookies, CSRF/origin validation and token-family reuse detection. Social providers remain optional; domestic accounts must not depend on Google, Discord or Steam.

## 7. Networking and multiplayer reliability

The current transport already has pinging, bounded reconnect attempts and retry delays. Improve that foundation instead of replacing it.

### WebSocket improvements

- Exponential reconnect backoff with jitter.
- Explicit states: resolving, connecting, authenticated, joining, synchronising, live, reconnecting and terminal failure.
- Heartbeat with latency and packet-loss estimates.
- Sequence numbers and acknowledgements for state-changing messages.
- Idempotency keys for commands that must not run twice.
- Bounded send queue and backpressure handling.
- Snapshot resynchronisation after reconnect.
- Short match-resume grace period.
- Graceful server restart and match termination handling.
- Client/protocol/match version compatibility checks.

### Match integrity and anti-cheat

The deterministic client-simulation model is useful for responsiveness, but ranked play needs stronger authority:

1. Keep client rendering and local prediction responsive.
2. Validate actions server-side using existing schemas and authorization.
3. For competitive modes, run canonical simulation or trusted replay validation in a server-controlled worker.
4. The server—not a player client—decides the authoritative result.
5. Record an append-only event stream for ranked matches.
6. Add replay consistency tests and suspicious-behaviour detection.
7. Keep unranked/private modes flexible where appropriate.

Do not promise cheat-proof gameplay. Use layered prevention, monitoring and review.

### Matchmaking

Queue by mode, rating, party size, region and measured latency. Expand rating range gradually with wait time, prevent unfair party composition, and provide explicit queue/cancel/retry/reconnect states. Prefer a local region for domestic users.

## 8. Backend, storage and domestic deployment

For the first stable domestic release, keep the deployment simple but the boundaries clear.

**Logical services**
- Web/API: static assets, accounts, profiles and metadata.
- Lobby service: public rooms, private codes, matchmaking and presence.
- Match workers: isolated match processes with bounded CPU and memory.
- PostgreSQL: accounts, profiles, sessions, ratings, match summaries, clans, moderation and audit.
- Redis: ephemeral presence, queue state, rate limits and hot leaderboard cache.
- Object storage: map packs, replays, exports and backup artefacts.
- Observability: local metrics, logs, traces and alerting.

A single VPS can host a small beta, but isolate PostgreSQL, Redis and match workers with resource limits. Split database and match workers as real load grows.

**Backups and recovery**
- Automated daily full backup and frequent incremental/WAL backup.
- Encrypted second copy at a separate Iranian provider or region.
- Restore tests, not just backup creation.
- Versioned deployment artefacts, migrations and runbooks.
- Secrets outside Git; offline controlled backup of signing keys.
- Rollback and disaster-recovery procedure.

**Iran-first dependency policy**

No core game path should require Cloudflare Pages/Workers, Render, Vercel, a foreign CDN, external fonts, external analytics, Turnstile, Google/Discord/Steam OAuth or foreign payment/notification APIs. Use domestic DNS, local assets, API, WebSocket, identity and a locally reachable certificate-renewal path. Domestic hosting improves resilience but cannot guarantee service during a complete domestic network failure.

## 9. Graphics, performance and sound

Keep the WebGL2 renderer and improve it incrementally:
- Terrain relief, elevation shading and topographic contours.
- Readable borders and distinct water/terrain materials.
- Objective, supply and intelligence layers.
- Tactical visualisation for routes, range, threats and coverage.
- LOD for map detail and unit density.
- Texture-atlas and draw-call review.
- Dynamic resolution and effect scaling.
- Low-power rendering path and reduced motion.

Targets to validate on representative devices:
- 60 FPS on capable desktop hardware in normal view.
- Stable 30 FPS mode on lower-end mobile.
- No long main-thread stalls caused by simulation or menus.
- Bounded memory and controlled texture residency.
- Measured time-to-interactive and asset size.
- Network quality measured separately from local FPS.

Create original audio cues for alerts, orders, logistics disruption, objectives and victory. Separate UI, alerts, combat, ambience and music volume. Sound must supplement—not replace—visual information.

## 10. Persian language, copy and accessibility

Persian translation has broad key coverage, but needs product ownership and editorial cleanup.

- Replace upstream names, domains and support references with Open War-owned copy.
- Establish a glossary for territory, theatre, supply, objective, doctrine, reconnaissance, alliance, lobby and rating.
- Use consistent tone per surface and avoid unexplained English abbreviations.
- Make dates, numbers and units locale-aware.
- Keep RTL correct while IDs, codes, URLs and email remain LTR.
- Test line wrapping, buttons and map labels on small screens.
- Maintain English as a first-class language and use predictable fallback.

Aim for WCAG 2.2 AA for menus/settings where practical: keyboard navigation, visible focus, accessible icon labels, adequate contrast, text scaling, colourblind palettes, reduced motion, touch targets around 44 × 44 CSS px and informative error recovery. Essential information must never rely on colour, sound or animation alone.

## 11. Moderation and community

- Block/report players, mute chat and quick messages.
- Rate-limit chat, invites, room creation and repeated reports.
- Separate player, moderator, support and administrator permissions.
- Moderator audit logs and appeals.
- Clear code of conduct and sanctions policy.
- Local announcements and maintenance status.
- Optional community links to Rubika, Bale, Eitaa and Soroush; these must never be gameplay dependencies.
- Transparent rules for ranked resets, matchmaking and account deletion.

## 12. Monetisation

Keep competitive outcomes free of payment advantages.

Potential products: cosmetic insignias, profile banners, map themes, unit appearance, UI themes and optional supporter membership with non-gameplay benefits. Avoid paid combat bonuses, loot-box ambiguity, paywalls around core multiplayer and hard-to-cancel subscriptions. Payments should be optional and the game must remain playable without them.

## 13. Phased delivery and release gates

### Phase 0 — Product ownership
- Establish Atlas Command art direction and design tokens.
- Audit every page/modal on desktop and mobile.
- Remove stale upstream branding and provider assumptions.
- Inventory every external network request and asset.
- Publish clear connection and status states.

**Gate:** no core page has broken branding, foreign asset dependency or misleading placeholder.

### Phase 1 — Core experience
- Operations dashboard.
- Guided lobby setup.
- In-game HUD and mobile command rail.
- Searchable settings and accessibility controls.
- Original icon family, illustrations and audio cues.

**Gate:** usability tests with new and experienced players; desktop and mobile flows work unaided.

### Phase 2 — Identity and persistence
- Durable local accounts and guest upgrade.
- Password hashing, recovery, token rotation and revocation.
- Profiles, match history and persistent settings.
- PostgreSQL migrations and tested restore.

**Gate:** registration, guest upgrade, login, recovery, sign-out everywhere and deletion pass automated/manual tests.

### Phase 3 — Multiplayer trust
- WebSocket sequence/ack and reconnect/resync.
- Ranked authoritative simulation/validation.
- Event log and replay verification.
- Local lobby registry and health.
- Load and abuse tests.

**Gate:** two-client and multi-client matches, disconnect/reconnect, restart recovery and load tests all pass.

### Phase 4 — Differentiating mechanics
- Supply/logistics.
- Intelligence and recon.
- Multi-objective theatre victory.
- Doctrine choices.
- Co-op campaign and scenario editor.

**Gate:** balance simulations, onboarding comprehension and repeat-play tests.

### Phase 5 — Growth
- Seasonal competition, clans/groups and community operations.
- Moderation dashboard and appeals.
- Optional cosmetics and supporter programme.
- Curated map/scenario publishing.

**Gate:** moderation, economy, abuse prevention and support operations ready for public scale.

## 14. Acceptance test matrix

| Area | Required verification |
|---|---|
| Identity | Guest start/upgrade, registration, login, recovery, token rotation, revocation and logout everywhere |
| API security | Origin/CSRF, authorization, schema validation, rate limits and privilege checks |
| WebSocket | Join, heartbeat, latency, reconnect, replay-safe commands, resync and terminal failure |
| Match integrity | Two-client/multi-client match, desync, authoritative result, invalid intent and malicious payload |
| Lobby | Public listing, private room, invite, matchmaking, cancel and full-room edge cases |
| Data | Migrations, idempotency, retention, account deletion, backup and restore |
| UI | Desktop/tablet/Android, RTL/LTR, keyboard, touch, screen reader and reduced motion |
| Graphics | FPS, memory, texture residency, low-power profile and WebGL capability variations |
| Content | Translation keys, stale-name search, glossary, help articles and error copy |
| Operations | Health/readiness, logs, metrics, crash recovery, rollback and incident runbook |
| Domestic reachability | Test from several Iranian mobile/fixed networks under a controlled no-international-route condition where possible |

A successful frontend build or healthy HTTP endpoint is not sufficient to declare multiplayer ready.

## 15. Priority decisions

The highest-value first investments are:

1. Original visual identity and operations dashboard.
2. Durable local accounts and persistence.
3. Reliable reconnect and match integrity.
4. Supply/logistics, intelligence and objective-based victory.
5. Iran-first self-hosted topology.

Do not start by adding dozens of buildings, currencies or cosmetic menus. Make the core loop distinctive, readable, fair and reliable first; expand content after that foundation is proven.
