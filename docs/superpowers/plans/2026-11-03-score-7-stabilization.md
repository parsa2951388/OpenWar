# Open War Score-7 Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the currently deployed Open War experience from the audited baseline of 4.2/10 to a defensible target of at least 7/10 by fixing release-blocking localization, build identification, server-list diagnostics, brand consistency, and production health verification.

**Architecture:** Preserve the existing deterministic game engine, Lit-based client, server-list API, and Render/Cloudflare hosting arrangement. Implement targeted fixes on a dedicated branch, prove them with focused tests and CI, then deploy to a parallel Pages project only after its slug is confirmed available and the owner reviews the release candidate.

**Tech Stack:** TypeScript, Lit, Vite, Vitest, Node 24, GitHub Actions, Cloudflare Pages/Workers, Render.

**Spec:** `docs/superpowers/specs/2026-11-03-open-war-premium-redesign-design.md`

## Global Constraints

- Preserve deterministic simulation behavior and the existing multiplayer protocol.
- Do not rewrite the game engine or replace the current backend architecture.
- Every new user-facing string must be present in both `resources/lang/en.json` and `resources/lang/fa.json`.
- Persian remains RTL and English remains LTR; use the existing shared direction helpers.
- Preserve the upstream OpenFront attribution, AGPL-3.0 additional conditions, and CC BY-SA 4.0 asset obligations.
- Keep the existing `parsaoj.pages.dev` deployment intact as rollback.
- Do not buy a domain, upgrade hosting, or create paid infrastructure.
- Do not deploy a release candidate to the public production hostname until automated and multiplayer smoke tests pass.
- Use the exact runtime versions declared in `package.json`: Node >=24.15.0 <25 and npm >=12.1.0 <13.

## Review Focus

- Missing custom element registration or startup ordering can leave every localized UI control blank; test cold startup and locale switching.
- The server-list endpoint can return an HTML error page with HTTP 200; test content-type and malformed-body handling without losing the last known-good cache.
- Missing or malformed build metadata can regress to the literal `vx.xx.xx`; test tagged, untagged, and unknown build metadata.
- Long Persian strings, mixed-direction usernames, and narrow screens can clip or reorder controls; test representative RTL content at 360px and 390px.
- A process-level health response can be green while the multiplayer worker is not ready; verify health semantics and two independent clients before release.

---

### Task 1: Restore deterministic localization startup

**Files:**
- Inspect/modify: `index.html`
- Inspect/modify: `src/client/Main.ts`
- Inspect/modify: `src/client/LangSelector.ts`
- Inspect/modify: `src/client/Utils.ts`
- Inspect/modify: `src/client/components/MainLayout.ts` and the actual root custom-element registration module identified during implementation
- Test: add focused client test(s) adjacent to the existing localization/LangSelector tests

**Interfaces:**
- Consumes: existing `LangSelector` custom element and existing `translateText()`/RTL helpers.
- Produces: a single guaranteed, registered `<lang-selector>` instance before code paths that query it; localization fallback must be explicit and observable rather than silently leaving blank labels.

- [ ] **Step 1: Write a failing startup test** asserting that the application root contains exactly one registered `lang-selector` before `Main` initializes and that the element is available to `translateText()`.
- [ ] **Step 2: Run the focused test** with the repository's Vitest client project and confirm it fails against the current startup wiring.
- [ ] **Step 3: Trace the existing Lit custom-element registration/import graph.** Register the existing component through the established entry point; do not create a duplicate implementation or a second language state store.
- [ ] **Step 4: Add a regression test** for English startup, Persian startup, switching locale after load, and a missing-translation fallback that never renders an empty button label.
- [ ] **Step 5: Run the focused tests and typecheck.** Confirm the missing-element warning is absent and every interactive `data-i18n` control receives non-empty accessible text.
- [ ] **Step 6: Commit** as `fix(i18n): initialize language selector before client startup`.

### Task 2: Make server-list polling robust and explainable

**Files:**
- Modify: `src/client/ServerList.ts`
- Inspect/modify: `src/client/ApiBase.ts`
- Inspect server route definitions for `/cluster.json` and the Pages proxy route before changing routing.
- Test: focused `ServerList` Vitest tests in the existing client test layout.

**Interfaces:**
- Consumes: `serverListUrl(site)`, `ServerListSchema`, `recordAttempt()`, and the cached server-list state.
- Produces: a fetch path that accepts only valid JSON server-list responses, distinguishes HTTP error, HTML fallback, invalid JSON, and schema mismatch, and preserves the last known-good list on all failures.

- [ ] **Step 1: Write failing tests** for: valid JSON 200; HTML body with 200; JSON body with wrong content type; 404; 5xx; malformed JSON; schema-invalid JSON; and a failed refresh after a successful cached response.
- [ ] **Step 2: Run the focused tests** and confirm the new cases fail or expose the current ambiguous diagnostic behavior.
- [ ] **Step 3: Inspect the actual `/cluster.json` route and production proxy path.** Identify why HTML is returned for a server-list request before changing the endpoint, proxy, or API base.
- [ ] **Step 4: Harden `fetchServerList(site: string)`.** Check response status and content type before parsing; read the response body safely; classify non-JSON/HTML responses as a malformed server-list response; log one concise structured warning with URL host, status, and content type but no tokens/cookies; keep `cached` unchanged.
- [ ] **Step 5: Add regression coverage** proving that a transient HTML response does not clear the cached list, does not throw to UI callers, and the next valid JSON response restores reachability.
- [ ] **Step 6: Run focused tests and typecheck.** Verify no uncaught JSON parsing error and no repeated noisy logging for the same failure class.
- [ ] **Step 7: Commit** as `fix(network): validate server-list responses before parsing`.

### Task 3: Remove placeholder build identity

**Files:**
- Modify: `src/client/GameVersion.ts`
- Inspect: build/deploy scripts that inject `GAME_VERSION` and `GIT_COMMIT`
- Test: adjacent `GameVersion` unit tests (create a focused test file if none exists).

**Interfaces:**
- Consumes: existing `composeGameVersion(rawVersion, gitCommit)`, `taggedGameVersion()`, and `renderNavVersion()`.
- Produces: a stable human-readable build label; never displays `vx.xx.xx` to a player.

- [ ] **Step 1: Write unit tests** for a tagged release, valid 7-40 character commit SHA, `DEV`, empty commit, malformed version, and placeholder version.
- [ ] **Step 2: Run tests** and confirm the placeholder case fails.
- [ ] **Step 3: Update version composition** to reject the literal placeholder and use the validated short commit when available; if no commit is available, use a clearly documented neutral label such as `development` rather than a fake semantic version.
- [ ] **Step 4: Verify nav and footer use the same composed build identity** without changing unrelated Electron/Steam version semantics.
- [ ] **Step 5: Run focused tests, typecheck, and build.**
- [ ] **Step 6: Commit** as `fix(build): replace placeholder version with real build identity`.

### Task 4: Reconcile visible branding without removing attribution

**Files:**
- Inspect/modify: `index.html`
- Inspect/modify: `src/client/components/DesktopNavBar.ts`
- Inspect/modify: `src/client/components/MobileNavBar.ts`
- Inspect/modify: `src/client/components/Footer.ts`
- Inspect/modify: the exact translation entries and asset references for legacy promotional elements found in the live DOM.
- Preserve: `LICENSE`, `LICENSE-ASSETS`, `asset-credits.html`, and required upstream attribution.

**Interfaces:**
- Consumes: existing Open War logo assets, localization dictionaries, and source/asset attribution links.
- Produces: consistent Open War user-facing brand identity, while retaining accurate upstream legal credit and unofficial-fork wording.

- [ ] **Step 1: Create a brand audit test/checklist** that scans shipped HTML and translation strings for known legacy promotional labels/links, excluding explicit legal attribution and upstream-source links.
- [ ] **Step 2: Run the audit** and capture each remaining user-visible legacy element with its exact file and context.
- [ ] **Step 3: Replace only user-facing promotional remnants** with Open War wording/assets or remove them where they are not needed; do not remove license notices, asset credits, or source links.
- [ ] **Step 4: Verify desktop and mobile navigation use the same Open War identity** and no logo/image is broken.
- [ ] **Step 5: Run localization parity check** to ensure English and Persian dictionaries still have matching keys and non-empty values.
- [ ] **Step 6: Commit** as `fix(branding): align visible navigation with Open War identity`.

### Task 5: Release hardening and evidence-based acceptance

**Files:**
- Inspect/modify: Render service health-check setting (dashboard/API only if supported and safe).
- Inspect/modify: `Dockerfile` only if the existing `/api/health` response does not meet readiness semantics.
- Modify: CI workflow only if an existing required check is absent or misconfigured.
- Create: release evidence document under `docs/release/` with exact tested commit, check results, and unresolved limitations.

**Interfaces:**
- Consumes: Docker `HEALTHCHECK`, `/api/health`, GitHub Actions CI, Render deployment/logs, Cloudflare Pages Worker proxy.
- Produces: documented readiness evidence and a safe candidate deployment path.

- [ ] **Step 1: Define a health test** that proves the endpoint returns success only when the required game server components are initialized; test both ready and not-ready states.
- [ ] **Step 2: Verify Render's configured health-check path** and set it to `/api/health` only if the tool/API supports this change safely; do not change the plan tier.
- [ ] **Step 3: Run CI checks**: `npm run typecheck`, `npm run build-prod`, `npm test`, `npm run lint`, `npm run format:check`, and Docker build/startup health check.
- [ ] **Step 4: Run multiplayer smoke tests** with two independent clients: create room, join room, start match, exchange game updates, reconnect after a network interruption, and complete a match.
- [ ] **Step 5: Validate Cloudflare proxy semantics** for ordinary HTTP requests, cookies, and WebSocket upgrade; keep the existing Pages project untouched.
- [ ] **Step 6: Check whether `open-war.pages.dev` is available globally.** Cloudflare documents that an existing `*.pages.dev` subdomain cannot be renamed; a separate Pages project is required. Do not delete or overwrite `parsaoj.pages.dev`.
- [ ] **Step 7: Deploy a candidate to the parallel Pages project only after slug availability, CI, and multiplayer smoke tests pass.** If the slug is unavailable or deployment cannot be performed safely, stop and report it without choosing another public URL.
- [ ] **Step 8: Capture desktop/mobile screenshots and run a final issue checklist.** Do not claim performance metrics unless measured in a real browser.
- [ ] **Step 9: Commit** the release evidence and open a pull request for owner review; do not merge or cut over the production URL without explicit final approval.

---

## Score-7 acceptance rubric

A target score of 7/10 is accepted only if all conditions below are evidenced:

| Dimension | Minimum evidence |
|---|---|
| Localization | No missing `lang-selector`; no empty visible `data-i18n` labels; English/Persian switch works; RTL verified at 360px and 390px |
| Build identity | No visible `vx.xx.xx`; nav/footer agree on build label |
| Server-list reliability | HTML/invalid responses are classified; cached valid response survives transient failure; no uncaught parse errors |
| Branding | Open War assets and wording consistent; legacy promotional UI removed; legal attribution retained |
| Availability | Health endpoint reflects readiness; Render config verified; no unverified "always online" claim |
| Multiplayer | Two-client room/match/reconnect smoke test passes |
| Engineering | Typecheck, build, tests, lint, formatting, and Docker validation pass |
| Deployment | Candidate URL and rollback path documented; old production site remains available |

If any multiplayer or CI gate cannot be run in the available environment, mark the score as **provisional** and do not claim the full 7/10 has been achieved.
