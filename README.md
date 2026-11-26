# Open War

**Open War** is an independent community fork of [OpenFrontIO](https://github.com/openfrontio/OpenFrontIO), focused on territorial real-time strategy and an expanded air-combat layer.

- **Project:** Open War
- **Source:** this repository's `main` branch
- **Playable site:** [open-war-online.onrender.com](https://open-war-online.onrender.com/)
- **Upstream project:** [OpenFrontIO](https://github.com/openfrontio/OpenFrontIO)

Open War is not an official OpenFront release. It preserves upstream attribution and licensing while developing its own identity and features.

## Current implementation status

The `main` source branch contains the OpenFront territorial-strategy foundation and the merged Open War aircraft work.

### Implemented in source

- Open War branding and project-specific client presentation.
- Airport construction and commercial-aircraft routes.
- Aircraft-carrier support.
- Air Fighter, Stealth Fighter, and Ground Attacker roles.
- Aircraft selection, movement, patrol and mission targeting.
- Aircraft fuel/range handling, return-to-base and servicing flows.
- Air-combat and ground-attack interactions, including interception/evasion behavior.
- Responsive client and map-rendering improvements.
- Aircraft system developer guide: [docs/AIRCRAFT_SYSTEM.md](docs/AIRCRAFT_SYSTEM.md).

These items describe code merged into the repository. They are **not a claim that every feature is currently working on the public deployment**.

### Verification and release status

The browser shell, world map, spawn flow, tutorial, HUD and basic map interaction have been smoke-tested in earlier development checks. The following still require explicit end-to-end acceptance before Open War should be described as production-ready:

- Two independent clients completing a full online match.
- Production identity, OAuth and account flows.
- Matchmaking registration and WebSocket upgrade against the intended API.
- Aircraft gameplay in a live multiplayer match.
- Physical-device mobile viewport and touch controls.
- A fresh deployment check against the exact `main` commit.

Deployment and API integration work is tracked separately in the repository's pull requests. A merged source change, a successful CI run, and a successful production deployment are three different states; do not treat one as proof of the others. Use the [testing guide](docs/TESTING.md) when validating changes and the [release-readiness checklist](docs/RELEASE_CHECKLIST.md) before merging or promoting a release.

## Getting started

### Requirements

- Node.js `24.15.x` (Node 24 release line).
- npm `12.1.x` (npm 12 release line).
- Git and a modern browser.

Check the installed versions before proceeding:

```bash
node --version
npm --version
```

### Install and run locally

```bash
git clone https://github.com/parsa2951388/OpenWar.git
cd OpenWar
npm run inst
npm run dev
```

Use the repository's `npm run inst` command for the pinned dependency-install procedure. Do not replace it with an unreviewed `npm install` workflow.

Useful development commands:

```bash
npm run start:client
npm run start:server-dev
npm run typecheck
npm run lint
npm run format
npm test
npm run build-prod
```

The development server uses development configuration. Do not expose it as a production service or use development credentials for a public deployment.

## Repository layout

- `src/client/` — browser client and user interface.
- `src/server/` — Node.js game server.
- `packages/engine/` — deterministic game simulation.
- `packages/engine-api/` — engine contracts and worker protocol.
- `packages/engine-lib/` — shared game rules and helpers.
- `packages/shared/` — client/server shared schemas and configuration.
- `resources/` — game resources and static assets.
- `tests/` — unit and regression tests.

## Contributing

Contributions should be focused, reviewable and supported by relevant tests. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Do not submit generated files, secrets, proprietary game data or unlicensed assets.

For gameplay changes, include the affected game mode, reproduction steps, expected behavior, actual behavior and test evidence. For UI changes, include desktop and mobile screenshots where practical.

## Licensing and attribution

Open War is derived from OpenFrontIO. The source code is distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. Modified versions must preserve the applicable copyright notices and meet the license's source-disclosure requirements, including when users interact with the modified software over a network.

Assets under `/resources` are subject to the separately applicable **CC BY-SA 4.0** terms where indicated. Files under `/proprietary` and externally hosted assets are not granted for independent reuse. Do not extract, repackage or redistribute assets outside their applicable terms.

See [LICENSE](LICENSE), [LICENSE-ASSETS](LICENSE-ASSETS) and [LICENSING.md](LICENSING.md) for the applicable terms and provenance.

Open War is an independent community fork and is not endorsed by or affiliated with the OpenFront maintainers.
