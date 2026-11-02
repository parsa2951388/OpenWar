# Self-hosting Open War

## Deployment shape

Open War is a Node.js game server, not a static-only website. The production
container runs nginx on port **80**, a Node master process on port 3000, and
one or more game workers on ports 3001 onward. nginx handles HTTP and
WebSocket upgrade routing. Run the container as a long-lived web service and
route the public game hostname to container port 80.

The Docker image now includes a readiness health check against
`/api/health`. It returns healthy only after the master has enough ready game
workers. A process that is running but whose workers failed to start should
not be considered ready.

## Important upstream service dependency

The source tree documents the original account/game API as a closed-source
Cloudflare Worker. The game server currently expects an API issuer at
`https://api.<DOMAIN>` for, among other things:

- Ed25519 JWT public keys at `/.well-known/jwks.json`;
- guest/account token exchange and refresh;
- first-join Turnstile verification and name screening at `/join_verify`;
- server registration and the public server list;
- player/profile, cosmetics, progression and related account data.

Those endpoints are not supplied by this repository. Setting DNS or pointing
`API_DOMAIN` at the game server does not implement them. A public multiplayer
deployment is therefore **not ready** until an independently operated API
implements the required contracts and the two-client join/rejoin flow passes.

Do not expose `GAME_ENV=dev` as a public workaround. Development mode accepts
raw persistent IDs rather than production JWTs; those IDs are not an
authentication mechanism and can be impersonated.

## Required server configuration

The production server validates several environment variables at startup:

| Variable | Purpose |
| --- | --- |
| `GAME_ENV` | Must be `prod` for a public production server. |
| `DOMAIN` | JWT audience and current API hostname suffix. |
| `GIT_COMMIT` | Exact full commit SHA served by this container. |
| `NUM_WORKERS` | Positive number of game workers behind nginx. |
| `INSTANCE_LETTER` | One lowercase letter reserved for this deployment's game IDs. |
| `TURNSTILE_SITE_KEY` | Public Turnstile widget key served to browsers. |
| `API_KEY` | Private shared key used by server-to-API calls. |

A routable deployment also needs `GAME_HOST` or `SUBDOMAIN` and the matching
DNS/TLS configuration. `CDN_BASE` may be empty when assets are served by the
same origin. Secrets must be stored in the hosting provider's secret manager,
never committed to this repository.

## Local smoke test

Build and run the container:

```sh
docker build -t open-war .
docker run --rm -p 8080:80 open-war
```

The image build validates the production bundle and the container startup
configuration. The container will not become healthy until its game workers
are ready. The public API dependency above still prevents this smoke test from
proving a production multiplayer deployment.
