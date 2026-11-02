# Open War

Open War is an unofficial community fork based on [OpenFrontIO](https://github.com/openfrontio/OpenFrontIO), an open-source real-time strategy game focused on territorial control, resource management and alliances.

Open War is not affiliated with, endorsed by, or an official product of OpenFront Inc. or the OpenFront contributors.

## Project status

This repository contains the Open War fork and its game client, deterministic simulation engine, shared protocol packages and Node.js game server. The current work is focused on removing upstream private-service dependencies, replacing restricted brand assets, and preparing independent hosting.

**A public, production-ready independent multiplayer deployment is not declared complete until its own authentication, lobby service, WebSocket transport, security controls, asset audit, two-client end-to-end tests and Docker health checks have passed.**

## Attribution and licenses

- The game source is distributed under the GNU Affero General Public License version 3, together with the additional conditions recorded in [LICENSE](LICENSE). Read the complete license before modifying or redistributing this fork.
- Assets in `/resources` are licensed under Creative Commons Attribution-ShareAlike 4.0. Attribution to OpenFront / OpenFront Inc. and share-alike obligations apply. See [LICENSE-ASSETS](LICENSE-ASSETS) and [resources/LICENSE](resources/LICENSE).
- The upstream `/proprietary` assets are excluded from the Open War build and must not be copied into the deployed application.
- The required visible notice `© OpenFront and Contributors` is retained in the game footer.
- New Open War logo artwork is original project artwork and, because it is placed under `/resources`, is released under the same CC BY-SA 4.0 terms.

## Requirements

- Node.js 24.15.0 or newer in the Node 24 release line
- npm 12.1.0 or newer in the npm 12 release line
- A modern desktop or mobile browser

Install dependencies with the repository's locked install script:

```bash
npm run inst
```

Do not use `npm install` or `npm i` for the project workspaces. The `inst` script runs `npm ci --ignore-scripts` against the committed lockfile.

## Local development

Run the client and development server together:

```bash
npm run dev
```

Or start them separately:

```bash
npm run start:client
npm run start:server-dev
```

The development server has development-only identity shortcuts. **Do not expose development mode as a public production server.** Production hosting requires an Open War-owned issuer and signing keys, secure token verification, anti-abuse verification, correct worker routing and secret management.

## Validation commands

```bash
npm run typecheck
npm run build-prod
npm test
npm run lint
npm run format:check
```

Build and runtime results must be recorded against the exact deployed commit. A successful static build alone does not prove multiplayer readiness.

## Self-hosting

See [the self-hosting guide](docs/SELF_HOSTING.md) for container topology, readiness checks, required configuration and the remaining production API dependencies.

## Architecture

- `src/client/` — user interface, input, WebSocket transport and rendering
- `packages/engine/` — deterministic game simulation
- `packages/engine-api/` and `packages/engine-lib/` — simulation contracts, schemas, map and deterministic helpers
- `src/server/` — lobby, worker routing, HTTP and WebSocket game server
- `packages/shared/` and `packages/zbin/` — shared protocol, schemas and binary encoding
- `resources/` — redistributable game assets and static files

## Links

- [Open War source repository](https://github.com/parsa2951388/OpenWar)
- [OpenFrontIO upstream project](https://github.com/openfrontio/OpenFrontIO)
- [AGPL-3.0 license](LICENSE)
- [Asset license](LICENSE-ASSETS)
- [Asset credits](resources/public/asset-credits.html)
