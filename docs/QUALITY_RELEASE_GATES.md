# Open War Quality and Release Gates

This document defines the release bar for the Open War self-hosted deployment.

## Production source of truth

- Production repository: `parsa2951388/OpenWar`
- Production application branch: `open-war/independent-self-host`
- Current deployment branch must be checked in Render before each release.
- `main` is not a substitute for the production branch.
- The `open-war/quality-10-of-10` branch is a review branch; it is not deployed automatically.

## Required automated checks

The GitHub Actions workflow runs on pushes to `main`, `open-war/independent-self-host`, and this quality branch, as well as pull requests and merge queue requests.

Required checks:
- TypeScript typecheck across root and workspace packages
- Production Vite build
- Full Vitest suite
- Oxlint
- Formatting check
- Generated map consistency
- Production Docker image build

A green build alone is not proof of production readiness.

## Release acceptance gates

### Reliability
- Render service does not suspend during normal production usage.
- Health check is configured explicitly and reports ready only after the game worker is ready.
- HTTP, WebSocket upgrade, reconnect, deploy replacement and restart are tested through the Pages hostname.
- Warm/cold request latency and WebSocket reconnect time are measured.

### Origin security
- The Render origin cannot be used to bypass the Cloudflare Pages entry point.
- Any origin authentication must cover HTTP and WebSocket upgrades.
- Secrets are stored only in platform secret stores; never in source, client bundles, logs or analytics.
- Render platform health checks remain functional.

### Multiplayer
- Two independent browser contexts can authenticate, discover/join the same lobby, start a match and exchange synchronized turns.
- Disconnect/reconnect and match completion are covered.
- Failure output includes client/server diagnostics without leaking credentials.

### Persian and localization
- Persian locale is verified in a real browser, including RTL, mixed Persian/Latin text, numerals, HUD, dialogs and mobile layouts.
- All user-visible strings use the existing translation API.
- Crowdin-managed translation files are not edited manually.
- Open War branding is distinct while preserving upstream attribution and license notices.

### Visual and accessibility
- Lobby, mode selection, loading/error/empty states and game shell are responsive.
- Gameplay information remains legible at different viewport sizes.
- Keyboard access, focus visibility, contrast, touch target sizing and reduced-motion preferences are checked.

### Performance and observability
- Measure first interactive time, Core Web Vitals, JS transfer, map loading, render frame times, memory and WebSocket latency.
- Analytics are non-blocking and do not collect tokens, credentials, chat contents or unnecessary personal data.
- Amplitude/PostHog events are validated before dashboards are trusted.

### Legal and operational readiness
- Preserve AGPL-3.0 and CC BY-SA 4.0 obligations and attribution.
- Do not include restricted upstream proprietary assets.
- Document secret rotation, guest identity limitations, deployment rollback and incident response.

## Paid services and production changes

No paid compute tier, database, external analytics subscription or recurring service may be provisioned without explicit budget approval. Production secrets, DNS, access policies and live deployments must not be changed without a verified rollback path and explicit authorization.

## Current known risks

- Render Free can suspend after inactivity, causing cold starts.
- Render origin currently allows public network access; Pages proxy requests are not authenticated at the origin.
- The Pages proxy routes traffic to the Render origin; verify caching and asset delivery rather than assuming Pages is serving assets from a static CDN.
- Amplitude default project was observed with no events.
- A successful health endpoint does not prove multiplayer functionality; two-client E2E is mandatory.
