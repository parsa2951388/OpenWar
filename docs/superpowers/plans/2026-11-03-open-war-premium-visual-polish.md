# Open War Premium Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Improve Open War's first impression and mode-selection clarity without changing the simulation engine, wire protocol, or live match rendering.

**Architecture:** Retain Lit, Tailwind CSS, the existing asset pipeline, and the current single-origin Cloudflare Pages proxy. Correct the remaining mobile brand mismatch, refine the existing option/map surfaces in place, and keep motion and focus behavior accessible. Update the self-hosting guide to name the actual production origin.

**Tech Stack:** TypeScript, Lit, Tailwind CSS, CSS, Vitest, GitHub Actions, Docker, Render, Cloudflare Pages.

**Spec:** Existing production code and docs/SELF_HOSTING.md; comparative review of OpenFront and OpenBattle browser RTS UX patterns.

## Global Constraints

- Preserve OpenFront upstream attribution and the repository's AGPL-3.0 license.
- Do not modify simulation rules, matchmaking contracts, game protocol, save format, or server topology.
- Keep desktop, tablet, and mobile behavior responsive.
- Prefer existing Open War assets and CSS; add no heavy graphics dependencies.
- Maintain keyboard-visible focus and honor prefers-reduced-motion.
- Document the deployed Pages hostname exactly as open-war-8o2.pages.dev.

## Review Focus

- Mobile top-bar identity must use the Open War logo and accessible name.
- Selected map and option states must remain visually distinct from hover and disabled states.
- Keyboard focus must remain visible on selectable cards and lobby-code controls.
- Reduced-motion preferences must disable newly introduced motion.
- Live match HUD and map-rendering color calibration must remain unchanged.

### Task 1: Mobile brand consistency

**Files:** src/client/components/PlayPage.ts; tests/client/PlayPageTopBar.test.ts

- [x] Add rendered logo source and accessible-name assertions to the existing mobile top-bar test.
- [ ] Verify the focused test in CI.
- [x] Use the existing resources/images/OpenWarLogo.svg asset in the mobile header.

### Task 2: Homepage and map-selection polish

**Files:** src/client/styles.css; src/client/components/map/MapDisplay.ts; src/client/components/map/MapPicker.ts

- [x] Add a restrained ambient blue/cyan gradient only to the homepage shell.
- [x] Refine option and random-map cards with clear hierarchy, selected states, and restrained depth.
- [x] Apply the shared visual treatment to the actual featured-map and random-map cards.
- [x] Keep map cards keyboard-operable and show favorite controls on touch screens.
- [x] Add visible keyboard focus to cards and lobby-code controls.
- [x] Respect prefers-reduced-motion for the affected controls.

### Task 3: Deployment documentation accuracy

**Files:** docs/SELF_HOSTING.md

- [x] Replace the obsolete Pages hostname with the live production hostname.
- [x] Keep the Render origin and same-origin proxy architecture unchanged.

### Task 4: Release verification

- [ ] Run npm run typecheck.
- [ ] Run npm run build-prod.
- [ ] Run the full Vitest suite and lint/format checks.
- [ ] Build the production Docker image.
- [ ] Deploy the tested commit to the connected Render service.
- [ ] Recheck /api/health and /.well-known/jwks.json through the public Pages URL.
- [ ] Complete two-client multiplayer/browser gameplay validation before declaring multiplayer release readiness.
