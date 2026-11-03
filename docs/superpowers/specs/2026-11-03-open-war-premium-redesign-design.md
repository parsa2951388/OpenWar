# Open War — Premium RTS Redesign
## Design specification

- **Date:** 2026-11-03
- **Status:** Draft for owner review; implementation is not yet authorized by this document alone
- **Target public URL:** https://open-war.pages.dev (subject to global Pages slug availability)
- **Repository:** parsa2951388/OpenWar
- **Working branch:** open-war/redesign-spec
- **Starting revision:** 093505a9baed9c3e254ae649d7c86163b3f6824d

## 1. Product intent

Turn Open War into a cohesive, polished, premium real-time strategy experience that feels like a modern tactical command platform on desktop and mobile. The work must improve the actual playable product—not just create a marketing landing page or a decorative mock-up.

The primary experience is the playable strategy game: entering a match, understanding the battlefield, making decisions, coordinating with other players, and recovering gracefully from network interruptions. Every visual enhancement must support readability, clarity, and response time during play.

### Success criteria

1. The product has one consistent Open War visual language across entry, lobby, map selection, in-game HUD, overlays, menus, and mobile navigation.
2. Core gameplay remains intact: preserve the existing deterministic engine, simulation rules, network protocol, and authoritative server unless a separately tested defect requires a change.
3. Every visible interactive control has a clear state, accessible name, useful feedback, and a working action.
4. Persian and English are first-class experiences. Persian is RTL end-to-end, including mixed numerals, map labels, forms, menus, tooltips, toasts, and mobile layouts.
5. Visual effects are restrained and purposeful; they never obscure the battlefield, reduce contrast, or block input.
6. A release is not considered production-ready until the production build, CI, security checks, and two-independent-client multiplayer smoke test pass.
7. The previous public deployment remains available for rollback until the replacement URL has passed release checks.

## 2. Chosen technical direction

**Preserve the current game engine and incrementally redesign the product around it.** Do not rewrite the game from scratch, replace the simulation technology, or ship a static prototype in place of the running multiplayer game.

The repository already contains a real client, deterministic simulation engine, lobby and WebSocket server. Replacing that foundation would add risk without improving the core objective. Work should be organized in small, reviewable layers: design tokens and shared components; entry and lobby; in-game HUD and overlays; mobile and RTL refinement; then platform and release hardening.

The work is to be developed on a separate branch and delivered through a reviewable pull request. Do not merge to the production branch or replace the existing Pages deployment before acceptance checks pass.

## 3. Art direction and design system

### Visual concept: Tactical Command

- **Mood:** premium, cinematic, precise, strategic, and high-clarity.
- **Base surfaces:** deep graphite and midnight navy; use elevation, borders, and subtle tonal variation rather than large areas of pure black.
- **Accent system:** controlled electric cyan/blue for selection and navigation; warm amber for attention and strategic warnings; red for destructive or critical states; green only for confirmed success or allied status.
- **Typography:** legible, compact UI typography with clear hierarchy and numeric alignment. Audit the repository's bundled fonts and their licenses before adding any font. Persian glyphs must be tested for shaping, line-height, punctuation, and number alignment.
- **Depth:** layered panels, restrained translucency, subtle inner borders, soft shadows, and carefully controlled background lighting.
- **Iconography:** one coherent vector icon family with consistent stroke weight, optical size, and semantic meaning. Avoid mixing emoji, unrelated icon packs, and hand-drawn styles in the same control system.
- **Brand:** Open War wordmark and logo should be used consistently in the title area, loading state, lobby, browser metadata, and mobile shell. Do not remove legally required upstream attribution or imply that this unofficial fork is an official OpenFront product.

### Token system

Create semantic design tokens rather than scattering literal colors and spacing through components. Define tokens for:
- background, surface, elevated surface, overlay, border, and focus ring;
- primary, secondary, muted, inverse, and disabled text;
- accent, success, warning, danger, ally, enemy, and neutral map states;
- spacing, radius, elevation, z-index layers, typography scale, and motion duration;
- desktop, tablet, and mobile breakpoints.

All components must use the same tokens. Any theme variation must be implemented through tokens, not duplicated styles.

## 4. Experience surfaces and required coverage

### A. Entry and first-load experience

- Replace any generic or unfinished first-load presentation with a compact Open War identity treatment.
- Provide a clear loading state, progress/connection status where meaningful, and a recoverable error state.
- The first screen should make the primary action obvious and explain guest identity honestly; do not imply that guest progress is a recoverable account.
- Avoid long blocking intro animations. Users should reach the playable experience quickly.

### B. Main menu and lobby

- Give the lobby a strong visual hierarchy: play/join/create actions first, then mode/map choices, player information, and secondary links.
- Use distinct but consistent cards for game modes, maps, public/private rooms, and player status.
- Add useful empty, loading, disabled, validation, and error states—not just the success state.
- Make matchmaking, room creation, cancellation, and reconnect actions explicit and idempotent.
- Keep lobby layout usable on narrow mobile screens without hiding essential actions behind hover-only behavior.

### C. Map and in-game HUD

The battlefield is the primary surface and must retain visual priority.

- Redesign the top status bar, resources, population/army indicators, timers, selected territory, and action controls as one coherent HUD.
- Establish consistent grouping for economy, military, diplomacy, map tools, and match information.
- Improve selected/hovered/owned/ally/enemy/neutral territory states without changing the underlying gameplay semantics.
- Keep labels, borders, and indicators readable at map zoom levels and on low-resolution phones.
- Make contextual panels dismissible and prevent them from covering critical map interactions.
- Communicate action results through concise toasts, inline validation, and visible state transitions.
- Preserve map rendering and input performance. Decorative effects must never run at the expense of simulation or pointer responsiveness.

### D. Panels, overlays, and secondary screens

Audit and bring every surface into the same system:
- diplomacy, alliances, chat, player list, leaderboard, match statistics, settings, help, map and game options;
- dialogs, confirmation prompts, tooltips, dropdowns, popovers, notifications, connection banners, and error states;
- sign-in/guest identity and account-related copy;
- mobile navigation, compact menus, touch controls, and landscape layout.

Every feature should have an appropriate icon and concise label. Use illustration or imagery only where it improves orientation or atmosphere; do not place decorative art inside dense gameplay controls.

### E. Footer, metadata, and external links

- Align browser title, description, Open Graph metadata, favicon, app icons, and visible brand wording with Open War.
- Keep source repository, upstream project, license, asset license, and required attribution links accurate.
- Retain the visible © OpenFront and Contributors notice and the unofficial-fork disclaimer where required.

## 5. Motion and feedback

Use motion to communicate cause and effect, not as continuous decoration.

- Define a motion scale for micro-interactions, panel transitions, menu transitions, map feedback, and notifications.
- Add subtle hover, pressed, selected, focus, loading, and disabled states.
- Use brief, interruptible transitions for panel open/close, modal entry, menu navigation, and state changes.
- Animate numeric changes only when the animation does not delay comprehension or obscure live values.
- Avoid camera movement, pulsing, or parallax that competes with tactical map reading.
- Support prefers-reduced-motion; provide a reduced-motion mode in settings if the existing settings model supports it.
- Prefer CSS transitions and the Web Animations API for simple UI motion. Add a larger animation dependency only if the implementation audit demonstrates a clear benefit and bundle impact is measured.

## 6. Original imagery and asset policy

- Create a small, art-directed set of original Open War assets: a primary entry/lobby backdrop, mode/map thumbnails only where they improve selection, and compact empty/error-state illustrations where a visual cue is genuinely useful.
- Use original or explicitly licensed assets only. Do not copy assets from upstream proprietary directories or scrape commercial art for direct reuse.
- Preserve the existing /resources licensing rules and add attribution for any new externally sourced assets.
- Prefer optimized AVIF/WebP for raster artwork with appropriate fallbacks; use SVG for logos and simple interface symbols.
- Lazy-load non-critical artwork, size images responsively, and avoid large background video.
- Reuse the existing map and game art where its license permits; do not invent replacement terrain art that misrepresents the game.

## 7. Responsive design, touch, and accessibility

Test at representative widths including 360, 390, 768, 1024, 1280, and 1440 CSS pixels, plus landscape mobile.

- Design mobile controls for touch with practical hit areas and no hover dependency.
- Keep critical information visible and avoid accidental overlap between HUD, panels, and map controls.
- Use semantic controls, keyboard navigation, visible focus, meaningful accessible names, and dialog focus management.
- Target WCAG 2.2 AA contrast for text and essential controls; verify actual colors rather than relying on visual impression.
- Ensure state is not conveyed by color alone.
- Verify text scaling, long translations, Persian shaping, mixed RTL/LTR content, tooltips, and responsive table/list layouts.
- Ensure the game remains usable with reduced motion and without sound.

## 8. Localization and RTL

The repository currently contains English and Persian dictionaries with matching translation-key coverage. This redesign must preserve that coverage and validate runtime behavior rather than assuming extracted HTML proves whether translations are loaded.

- All new user-facing strings must exist in resources/lang/en.json and resources/lang/fa.json.
- Use the shared RTL helpers; avoid one-off direction overrides scattered across components.
- Audit flex direction, icon placement, chevrons, alignment, text truncation, number formatting, map labels, chat, and mixed-direction usernames.
- Test switching locale while in the lobby and during a match.
- Do not mirror directional map symbols or tactical icons if mirroring would change their meaning.

## 9. Performance and engineering constraints

Establish a baseline before optimizing and record the tested device/browser/commit.

- Preserve deterministic simulation behavior and protocol compatibility.
- Keep rendering work, decorative animation, and DOM updates outside the simulation's critical path where possible.
- Measure client bundle size, image payload, first-load behavior, memory use, frame stability, and WebSocket reconnect behavior.
- Set and measure Core Web Vitals goals: LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 at the 75th percentile where field measurement is available.
- For lower-end supported mobile devices, target a stable, playable rendering cadence; record actual results rather than claiming a universal FPS.
- Add code splitting and lazy loading only where it reduces real user cost without delaying the primary game path.
- Do not add a large UI or animation framework without a documented need and measured bundle impact.
- Keep dependency updates separate from the UI redesign unless required for a verified defect or security issue.

## 10. Multiplayer, security, and reliability

Visual polish cannot hide an unreliable multiplayer backend.

- Verify guest token issuance, refresh, expiry, logout behavior, and the existing limitations of stateless guest refresh tokens.
- Verify lobby creation/join/cancel, matchmaking, WebSocket upgrade, reconnect, and match completion with two independent clients.
- Validate origin/CORS rules, request and connection rate limits, input validation, security headers, cookie flags, and secret handling.
- Never expose development-mode identity shortcuts or secrets in the public environment.
- Review Cloudflare Turnstile configuration; only enable it when both site and secret keys are correctly configured.
- Verify health/readiness behavior against the actual running game workers, not merely an HTTP process response.
- Add actionable connection/error states to the UI without leaking internal stack traces or secrets.
- Document known guest identity limitations clearly; do not present guest identities as recoverable accounts.
- Maintain a security review for WebSocket origin validation, abuse controls, and request/body-size limits.

## 11. Hosting, URL, and rollback plan

### Target URL

The intended public URL is https://open-war.pages.dev. Cloudflare Pages does not permit changing the immutable *.pages.dev project subdomain in place. Before creating the new project, check whether the requested slug is globally available.

### Safe cutover

1. Keep the current parsaoj.pages.dev Pages project and current Render service intact as rollback.
2. Create a separate Pages project for the Open War slug only after availability is confirmed.
3. Deploy the current full-proxy Worker pattern to the new project, preserving HTTP method, path, query, headers, cookies, request body, and WebSocket upgrade semantics.
4. Update the game server's production domain and API base URL to the new Pages origin through the secret/configuration manager; do not combine same-origin proxy mode with direct game-host mode.
5. Confirm guest auth/JWKS/cookies, static assets, API calls, and WebSocket traffic all use the intended origin.
6. Run the full browser and two-client smoke tests against the new hostname.
7. Keep the old hostname live until the new deployment passes the release checklist. Do not delete the previous project as part of the cutover.
8. If the slug is unavailable, stop before creating a different public URL and report the exact alternative for owner approval.

### Hosting cost constraint

Keep the currently configured hosting plan unless the owner explicitly approves a paid change. The existing Render free service may have cold-start and availability limitations; do not describe it as high-availability hosting. Do not purchase a domain, upgrade a plan, or create a billable service without explicit cost approval.

## 12. Connected tool responsibilities

Use connected services only where they materially support this product:

- **GitHub:** branch-based work, small commits, code review, pull request, and CI evidence.
- **Figma:** design tokens, responsive screen layouts, component states, and visual review before translating the approved design into code.
- **Cloudflare:** Pages project/origin configuration, Worker proxy verification, domain/slug availability, and relevant security/performance configuration.
- **Render:** deployment history, health/readiness, logs, metrics, and safe server configuration changes.
- **Context7:** verify current library/API documentation before changing integrations or adopting a new framework.
- **Amplitude:** use the existing analytics workspace for a minimal, privacy-conscious funnel only if its production project and keys are available and owner-approved.
- **Firecrawl/browser inspection:** inspect the live product and compare rendered page states where access is available.
- **PostHog:** use only if a configured project and a clear analytics purpose are confirmed; avoid duplicating the same events in multiple analytics systems.
- **Other connected data platforms (Airtable, Supabase, Neon, MongoDB Atlas, ClickHouse, Vercel, Linear, Notion, MagicPath):** do not provision or populate unrelated services merely to increase tool count. Use them only if a real requirement is identified and the relevant account/project is configured. No database replacement or paid infrastructure is part of this redesign by default.

No API key, signing secret, private key, user credential, or personal data may be committed to source control or copied into the design artifact.

## 13. Verification and release gates

### Automated checks

Run on the exact proposed release commit:
- npm run typecheck
- npm run build-prod
- npm test
- npm run lint
- npm run format:check
- npm run gen-maps when map data/schema changes require it
- Docker image build and startup/readiness validation

### Browser and game checks

- Entry screen, lobby, map selection, in-game HUD, every panel, settings, help, notifications, and error states.
- English and Persian locale; RTL at all target widths.
- Mouse, keyboard, touch, and reduced-motion behavior.
- Fresh guest, returning guest, expired token, logout, and blocked/failed auth paths.
- Create/join/cancel room, matchmaking, two independent clients, WebSocket connection, reconnect, and a completed multiplayer match.
- Test the Pages hostname and proxy behavior, including cookies, API, static assets, and WebSocket.
- Capture before/after screenshots for desktop and mobile and review visual regressions.
- Record Lighthouse/Core Web Vitals where browser instrumentation is available; if browser tracing is unavailable, state that limitation and do not invent measurements.

### Release decision

Do not claim a quality score or production readiness based on appearance alone. The project may be described as release-ready only when the checks above have passed and the remaining known limitations are documented.

## 14. Phased implementation plan

1. **Baseline and design foundation:** inspect every current screen; capture desktop/mobile states; establish tokens, type, icon rules, and shared UI primitives.
2. **Entry and lobby:** refresh first load, main navigation, mode/map selection, room creation/joining, and empty/error states.
3. **Battlefield UI:** unify HUD, panels, notifications, chat, diplomacy, leaderboard, and settings without changing simulation rules.
4. **Mobile and RTL:** finish responsive layouts, touch controls, Persian shaping, RTL, accessibility, and reduced motion.
5. **Assets and motion:** add only approved original artwork and purposeful transitions; measure payload and runtime cost.
6. **Platform hardening:** validate health/readiness, proxy behavior, guest auth, WebSockets, abuse controls, and observability.
7. **Release candidate:** run automated and two-client browser tests; deploy to the parallel Pages project; validate the new hostname while preserving the existing deployment for rollback.

## 15. Owner review

This document proposes the recommended direction: a premium tactical command-center identity, full-surface UI redesign, original licensed assets, native/lightweight motion, strict RTL and mobile support, and safe parallel hosting cutover.

**Approval requested:** approve this design specification as the implementation scope. After approval, the work plan and engineering changes can be produced on the feature branch. No production deployment, deletion of the existing site, paid upgrade, or domain purchase is authorized by this draft.
