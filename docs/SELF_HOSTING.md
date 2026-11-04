# Self-hosting Open War

## Deployment shape

Open War is a Node.js game server, not a static-only website. The production
container runs nginx on port **80**, a Node master process on port 3000, and
one or more game workers on ports 3001 onward. nginx handles HTTP and
WebSocket upgrade routing. Run the container as a long-lived web service.

The Docker image includes a readiness health check against `/api/health`.
It returns healthy only after the master has enough ready game workers. A
container whose main process runs but whose workers failed to start should not
be considered ready.

## Current production topology: Cloudflare Pages proxy

The current Open War deployment uses Cloudflare Pages as the browser-facing
origin and Render as the private upstream game-server origin:

- Browser URL: `https://open-war-8o2.pages.dev`
- Pages advanced-mode Worker: `cloudflare-pages/_worker.js`
- Upstream Node/nginx game server: `https://open-war-game.onrender.com`

The Pages Worker forwards the original request path, query, method, body,
headers, cookies and WebSocket upgrade metadata to the Render origin. This
keeps authentication, JWKS, game HTTP requests and game WebSockets on the same
browser origin. The Render hostname is the upstream target; clients should
normally enter the game through the Pages URL.

For this topology, use these server settings:

| Variable                                             | Value / purpose                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GAME_ENV`                                           | `prod`                                                                                                                          |
| `DOMAIN`                                             | `open-war-8o2.pages.dev` (hostname only; JWT audience)                                                                          |
| `API_BASE_URL`                                       | `https://open-war-8o2.pages.dev` (no trailing slash)                                                                            |
| `AUTH_ORIGIN`                                        | `https://open-war-8o2.pages.dev` (canonical origin for OAuth callbacks and email links)                                         |
| `DATABASE_URL`                                       | PostgreSQL connection string for permanent accounts, sessions and migrations; secret manager only                               |
| `AUTH_ENCRYPTION_KEY`                                | 32-byte hexadecimal key used to encrypt OAuth PKCE verifiers at rest; secret manager only                                       |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`          | Optional Google OAuth client credentials; register the exact callback URL documented below                                      |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`        | Optional Discord OAuth client credentials                                                                                       |
| `RESEND_API_KEY` / `EMAIL_FROM`                      | Required together for email verification, resend and password-recovery messages                                                 |
| `MAP_WEIGHTS_API_ENABLED`                            | Set to `false` when no upstream `/map_weights` endpoint exists; omitted defaults to enabled for upstream-compatible deployments |
| `SELF_HOSTED_AUTH`                                   | `true`                                                                                                                          |
| `GIT_COMMIT`                                         | Full commit SHA built into the server                                                                                           |
| `NUM_WORKERS`                                        | Positive number of game workers                                                                                                 |
| `INSTANCE_LETTER`                                    | One lowercase letter reserved for the standalone server                                                                         |
| `JWT_PRIVATE_KEY`                                    | Persistent Ed25519 PKCS#8 private key; secret manager only                                                                      |
| `JWT_KEY_ID`                                         | Stable key identifier                                                                                                           |
| `SUBDOMAIN`, `GAME_HOST`, `SITE_HOST`, `GAME_DOMAIN` | Leave unset for the same-origin Pages proxy mode                                                                                |
| `CDN_BASE`                                           | May be empty when assets are served through the same origin                                                                     |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`        | Optional pair; set both to enable Cloudflare Turnstile                                                                          |

Do not set `GAME_HOST` or `SITE_HOST` in the current full-proxy topology.
With those unset, the page shell injects a one-server cluster entry using
`DOMAIN`; the browser keeps game API and WebSocket traffic on
`open-war-8o2.pages.dev`, and the Pages Worker proxies it to Render. If this
standalone service has no compatible upstream `/map_weights` endpoint, set
`MAP_WEIGHTS_API_ENABLED=false`; the built-in default map rotation weights
remain active and the game does not poll the SPA fallback for JSON.

### Optional alternative: direct game-server connections

A different topology can serve the page from Pages but send game HTTP and
WebSocket traffic directly to a separate game hostname. In that case, set
`API_BASE_URL` to the Pages origin, set `SITE_HOST` to the Pages hostname,
and set `GAME_HOST` to the public game-server hostname. The game server's
CORS allowlist then needs to recognize the Pages page origin. Do not combine
these direct-host settings with the current full-proxy topology unless the
client is intentionally being configured to bypass the Pages proxy for game
traffic.

## Guest identity and permanent accounts

The self-hosted API registers two identity paths on the same browser origin:

- **Guest identity:** `/auth/guest` issues short-lived Ed25519 access JWTs and
  a signed, stateless 30-day refresh token. The browser receives the refresh
  token in a host-only `__Host-` cookie with `Secure`, `HttpOnly`,
  `SameSite=Lax` and `Path=/`. Guest identities are anonymous and stored
  browser-side; clearing browser data can lose an unlinked guest identity.
  Because guest refresh tokens are stateless, an individual token cannot be
  revoked before expiry; rotating the signing key invalidates all guest tokens.

- **Permanent account identity:** `SelfHostedAccountApi` adds database-backed
  email/password and configured Google/Discord OAuth flows, account linking,
  email verification, password recovery, refresh-token rotation and session
  revocation. Passwords are hashed with scrypt. Account refresh tokens are
  stored as hashes in PostgreSQL and tracked in a token-history table.
  OAuth uses Authorization Code with PKCE, state/nonce and a browser-bound
  transaction; the PKCE verifier is encrypted at rest.

Permanent-account authentication requires `DATABASE_URL`,
`JWT_PRIVATE_KEY`, `AUTH_ENCRYPTION_KEY` and `AUTH_ORIGIN`. The
`AUTH_ENCRYPTION_KEY` must be a 32-byte hexadecimal key and must be stored
only in the deployment secret manager. Numbered database migrations are
applied under a PostgreSQL advisory transaction lock.

Provider configuration is optional and independent:

- Google requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Its
  authorized redirect URI must exactly match
  `https://open-war-8o2.pages.dev/auth/callback/google` for the current
  production origin. While the Google consent screen is in Testing, each
  account that signs in must be an allowed test user.
- Discord requires `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`; it is
  not configured in the current production deployment.
- Email registration and verification, resend and password-recovery email
  delivery require both `RESEND_API_KEY` and `EMAIL_FROM`. Without them,
  new email registration is rejected with
  `email_delivery_not_configured`; existing account password login and
  provider OAuth are separate flows.
- Steam OAuth is not implemented by this self-hosted account API.

As observed from the live `/auth/status` endpoint on 2026-11-04, the database
was ready, Google credentials were present, Discord credentials were absent,
and email delivery was not configured. This endpoint reports configuration
and database readiness only; it does not prove a complete Google/Discord
browser sign-in. Verify the provider's redirect URI, audience and test-user
settings separately.

The game server also applies local username/clan-tag filtering and
connection/game rate limits. Cloudflare Turnstile can be enabled by setting
both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`; the server then
verifies challenges directly with Cloudflare. With neither configured, local
filtering and rate limits remain active, but the extra Turnstile challenge is
absent.

Do not expose `GAME_ENV=dev` as a public workaround. Development mode accepts
raw persistent IDs rather than production JWTs; standalone production mode
uses signed Ed25519 guest tokens and the separately configured account API.

## Local smoke test

Build and run the container:

```sh
docker build -t open-war .
docker run --rm -p 8080:80 open-war
```

The image build validates the production bundle and container startup
configuration. The container will not become healthy until its game workers
are ready. A browser smoke test is still required to verify guest login,
lobby creation, WebSocket connection, and a complete match with two
independent clients.
