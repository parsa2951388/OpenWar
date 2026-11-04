# Open War Quality-7 Implementation Plan

> **For agentic workers:** Use the native in-session execution path and review each task before proceeding. Steps use checkbox syntax for tracking.

**Goal:** Raise the current Open War deployment to a defensible minimum of 7/10 by repairing the broken locale entry point, boot-time UI timing, untagged build label, and self-hosted map-weight polling without replacing the real RTS engine.

**Architecture:** Preserve the current Lit client, deterministic simulation, and Node/Express master. Make narrowly scoped corrections at the existing component and configuration boundaries, test them with Vitest, and ship only after CI passes. Keep the current Pages hostname available as rollback while the new hostname is validated separately.

**Tech Stack:** TypeScript, Lit 3, Vitest 4, Node 24, GitHub Actions, Render, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-11-03-open-war-premium-redesign-design.md`

## Global Constraints

- Node.js version must remain `>=24.15.0 <25`; npm must remain `>=12.1.0 <13`.
- Preserve the current deterministic game engine, WebSocket protocol, and existing gameplay rules.
- Keep English and Persian translation dictionaries in sync; use the existing RTL helpers.
- Do not add a UI framework or animation dependency for these targeted reliability fixes.
- Do not commit secrets, tokens, signing keys, or provider credentials.
- Do not merge or deploy before the CI checks pass.
- Keep the existing `parsaoj.pages.dev` project intact until a parallel `open-war.pages.dev` deployment is verified.

## Review Focus

- A locale element must exist when `Main.initialize()` asks for it, and both mobile and desktop navigation must expose the same language action.
- Lit parent components can be registered before their child templates have rendered; the boot sequence must wait for `updateComplete`, not merely `customElements.whenDefined()`.
- Untagged builds must not display the false version string `vx.xx.xx`; tagged releases must retain their semantic version.
- A self-hosted server with no upstream map-weights API must use `DEFAULT_MAP_WEIGHT` without making a request to its own SPA proxy.
- Disabling the optional map-weights integration must not disable public lobby scheduling, the guest API, health checks, or game WebSockets.

---

### Task 1: Restore a visible language selector in shared navigation

**Files:**

- Modify: `src/client/components/NavUtilityIcons.ts`
- Create: `tests/client/NavUtilityIcons.language.test.ts`

**Interfaces:**

- Consumes: the already registered `lang-selector` custom element from `src/client/Main.ts`.
- Produces: one visible `<lang-selector>` control inside the shared `nav-utility-icons` cluster, used by both desktop and mobile navigation.

- [ ] **Step 1: Write the failing component test**

Create the utility icon component, append it to the document, await its `updateComplete`, and assert that it contains exactly one `lang-selector` element. Verify for both `size="desktop"` and `size="mobile"`.

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- --project client tests/client/NavUtilityIcons.language.test.ts`

Expected: FAIL because `nav-utility-icons` currently renders no language selector.

- [ ] **Step 3: Add the selector to the shared utility cluster**

Add `<lang-selector class="shrink-0"></lang-selector>` to the shared component template. Do not duplicate the language control in separate desktop and mobile implementations.

- [ ] **Step 4: Run the focused test**

Expected: PASS for desktop and mobile, with one selector per utility cluster.

- [ ] **Step 5: Commit**

```bash
git add src/client/components/NavUtilityIcons.ts tests/client/NavUtilityIcons.language.test.ts
git commit -m "fix: expose language selector in shared navigation"
```

### Task 2: Wait for Lit navigation to render before boot-time lookups

**Files:**

- Modify: `src/client/Main.ts`
- Modify: `tests/client/MainInitialize.test.ts`

**Interfaces:**

- Consumes: `LitElement.updateComplete` from the rendered navigation components.
- Produces: the language selector and game-version elements are mounted before `Main.initialize()` queries them.

- [ ] **Step 1: Extend the main initialization test**

Using the real `index.html` body already mounted by the test harness, assert that initialization sees a `lang-selector` element and both navigation version elements after Lit rendering.

- [ ] **Step 2: Run the focused test and verify the current race**

Run: `npm test -- --project client tests/client/MainInitialize.test.ts`

Expected: FAIL on the new selector/version readiness assertion, or demonstrate that the current test mock hides the race and requires a test seam.

- [ ] **Step 3: Await rendered navigation components**

After `customElements.whenDefined("mobile-nav-bar")` and `customElements.whenDefined("desktop-nav-bar")`, await the `updateComplete` promises for the mounted nav bars. Then query the resulting `nav-utility-icons` children and await their `updateComplete` promises before calling `renderNavVersion()` and querying `lang-selector`.

- [ ] **Step 4: Run the focused test**

Expected: PASS with the language selector and both version nodes present before the lookups.

- [ ] **Step 5: Commit**

```bash
git add src/client/Main.ts tests/client/MainInitialize.test.ts
git commit -m "fix: await navigation rendering during client startup"
```

### Task 3: Remove the false untagged version placeholder

**Files:**

- Modify: `src/client/GameVersion.ts`
- Modify: `tests/client/GameVersion.test.ts`

**Interfaces:**

- Consumes: `resources/version.txt` and the existing `taggedGameVersion(rawVersion: string)` helper.
- Produces: a valid tagged semantic version or an empty label; never the fake `vx.xx.xx` placeholder.

- [ ] **Step 1: Add an explicit placeholder test**

Assert that `taggedGameVersion("x.xx.xx")` returns an empty string, and that real tagged versions retain their `v` prefix.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- --project client tests/client/GameVersion.test.ts`

Expected: FAIL because the current implementation returns `vx.xx.xx`.

- [ ] **Step 3: Implement strict tagged-version rendering**

Only render a string matching the existing semantic-version pattern. For untagged placeholders, return `""`; retain the commit identity in the footer as already designed.

- [ ] **Step 4: Run the focused test**

Expected: PASS for tagged versions, whitespace, suffixes, and placeholder input.

- [ ] **Step 5: Commit**

```bash
git add src/client/GameVersion.ts tests/client/GameVersion.test.ts
git commit -m "fix: hide placeholder version on untagged builds"
```

### Task 4: Make map-weight polling explicitly optional

**Files:**

- Modify: `src/server/ServerEnv.ts`
- Modify: `src/server/Master.ts`
- Create: `tests/MapWeightsPollingConfig.test.ts`

**Interfaces:**

- Produces: `ServerEnv.mapWeightsApiEnabled(): boolean`.
- The setting is opt-out: the upstream-compatible default is enabled; the Render self-hosted service will set `MAP_WEIGHTS_API_ENABLED=false`.
- When disabled, public-lobby scheduling continues with `MapPlaylist.DEFAULT_MAP_WEIGHT`.

- [ ] **Step 1: Write the environment-config test**

Verify that the method defaults to `true`, returns `false` only when `MAP_WEIGHTS_API_ENABLED=false`, and returns `true` for unset or other values.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- --project node tests/MapWeightsPollingConfig.test.ts`

Expected: FAIL because the accessor does not exist.

- [ ] **Step 3: Add the explicit configuration accessor**

Implement `ServerEnv.mapWeightsApiEnabled()` and use it to guard only the `startPolling(fetchMapWeights)` block in `Master.ts`. When disabled, log once that the built-in default map weights are active. Do not gate lobby scheduling, cluster readiness, guest auth, or the HTTP/WebSocket server.

- [ ] **Step 4: Run the focused test**

Expected: PASS for all environment values.

- [ ] **Step 5: Commit**

```bash
git add src/server/ServerEnv.ts src/server/Master.ts tests/MapWeightsPollingConfig.test.ts
git commit -m "fix: make map weight API polling configurable"
```

### Task 5: Verify and deploy the quality-7 candidate safely

**Files:**

- No additional source changes unless a verification step exposes a regression.

**Interfaces:**

- Consumes: the code from Tasks 1–4 and GitHub CI.
- Produces: a reviewed pull request, passing automated checks, a manual Render environment setting, and a deployment on the existing public proxy only after checks pass.

- [ ] **Step 1: Set the existing Render service environment variable**

Set `MAP_WEIGHTS_API_ENABLED=false` on Render service `open-war-game`. Do not replace the existing environment-variable set and do not alter plan, region, instance count, JWT secrets, or domain values.

- [ ] **Step 2: Run the complete CI suite on GitHub**

Require the workflow to pass:

- `npm run typecheck`
- `npm run build-prod`
- `npm test`
- `npm run lint:github`
- `npm run format:check`
- `npm run gen-maps`
- Docker image build

- [ ] **Step 3: Review the pull request diff**

Confirm no game-engine rules, upstream license notices, attribution, secrets, or unrelated hosting settings changed.

- [ ] **Step 4: Merge only after successful checks**

Merge the quality branch into `open-war/independent-self-host`; do not merge to `main`.

- [ ] **Step 5: Trigger the existing Render service deployment**

The Render service has auto-deploy disabled. Trigger one manual deploy after the merge and verify the exact commit SHA, deployment status, readiness log, and `/api/health` response.

- [ ] **Step 6: Smoke-check the existing public URL**

Check `https://parsaoj.pages.dev` for:

- resolved English strings and a working language-picker control;
- Persian selection and `html[dir="rtl"]`;
- no `vx.xx.xx` placeholder;
- no repeated map-weight polling errors after the new deployment;
- HTTP health status 200.

- [ ] **Step 7: Keep the requested new hostname as a separate cutover**

Create and validate `open-war.pages.dev` as a parallel Pages project only after verifying the slug, proxy behavior, guest auth, and two-client WebSocket test. Never delete or repoint the old project as part of this task.

---

## Acceptance Criteria for 7/10

- Both nav layouts expose a working language picker.
- English and Persian translations resolve at runtime, and Persian sets RTL on the root document.
- The navigation startup no longer queries child elements before Lit renders.
- No fake `vx.xx.xx` version placeholder is displayed.
- Self-hosted operation can disable the unavailable upstream map-weight endpoint without breaking public lobbies.
- The GitHub build, typecheck, tests, lint, formatting, map-generation, and Docker build all pass.
- The live app, API health, and a two-client multiplayer match are verified before calling the deployment production-ready.

A 7/10 score is only a target for this scope; passing these checks does not imply high-availability hosting, full account recovery, or a new custom domain.
