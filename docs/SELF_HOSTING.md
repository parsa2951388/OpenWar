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

The standalone mode now provides its own Ed25519 guest-token issuer, JWKS,
refresh-cookie handling and minimal guest profile on the same origin as the
game server. It deliberately does not provide OAuth, account linking,
purchases, clans, progression, paid cosmetics or a cross-server registry.
Guest identities are anonymous and are not recoverable as accounts.

The game server applies local username/clan-tag filtering. Cloudflare
Turnstile can be enabled by setting BOTH `TURNSTILE_SITE_KEY` and
`TURNSTILE_SECRET_KEY`; the server then verifies challenges directly with
Cloudflare. With neither configured, the game remains playable using its
local name filter and connection/game rate limits.

For a Cloudflare Pages front door, deploy `cloudflare-pages/_worker.js` in
advanced mode and point it at this server. Set `API_BASE_URL` to the Pages
origin so guest authentication, JWKS and refresh cookies remain first-party
in the browser. Set `GAME_HOST` to the direct game-server hostname and
`SITE_HOST` to the Pages origin; clients use the former for game HTTP and
WebSockets, while the latter is the allowed browser origin for game API CORS.

Do not expose `GAME_ENV=dev` as a public workaround. Development mode accepts
raw persistent IDs rather than production JWTs; standalone production mode
uses signed Ed25519 guest tokens instead.

## Required server configuration

The production server validates several environment variables at startup:

| Variable | Purpose |
| --- | --- |
| `GAME_ENV` | Must be `prod` for a public production server. |
| `DOMAIN` | JWT audience and current API hostname suffix. |
| `GIT_COMMIT` | Exact full commit SHA served by this container. |
| `NUM_WORKERS` | Positive number of game workers behind nginx. |
| `INSTANCE_LETTER` | One lowercase letter reserved for this deployment's game IDs. |
| `GAME_HOST` | Public hostname the browser connects to for game HTTP and WebSockets. |
| `SITE_HOST` | Public website origin allowed by the game API's CORS policy (hostname only). |
| `API_BASE_URL` | Public HTTPS origin for auth/JWKS requests; use the Pages front door when one is configured. No trailing slash. |
| `SELF_HOSTED_AUTH` | Set to `true` to enable the independent guest API. |
| `JWT_PRIVATE_KEY` | Persistent Ed25519 PKCS#8 private key; store as a secret. |
| `JWT_KEY_ID` | Key identifier, for example `open-war-1`. |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Optional pair; set both to enable Cloudflare Turnstile. |
| `API_KEY` | Retained for optional internal integrations. |

For a single-host deployment, set `DOMAIN` to the provider's bare public
hostname and `API_BASE_URL` to `https://<hostname>`. Leave `GAME_HOST` and
`SUBDOMAIN` unset: the page shell injects a one-server map and all HTTP and
WebSocket traffic stays on the same origin. `CDN_BASE` may be empty when
assets are served by the same origin. Store the private key and Turnstile
secret in the hosting provider's secret manager; never commit them.

## Local smoke test

Build and run the container:

```sh
docker build -t open-war .
docker run --rm -p 8080:80 open-war
```

The image build validates the production bundle and the container startup
configuration. The container will not become healthy until its game workers
are ready. A browser smoke test is still required to verify guest login,
lobby creation, WebSocket connection, and a complete two-player match.
