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
| `MAP_WEIGHTS_API_ENABLED`                            | Set to `false` when no upstream `/map_weights` endpoint exists; omitted defaults to enabled for upstream-compatible deployments |
| `SELF_HOSTED_AUTH`                                   | `true`                                                                                                                          |
| `GIT_COMMIT`                                         | Full commit SHA built into the server                                                                                           |
| `NUM_WORKERS`                                        | Positive number of game workers                                                                                                 |
| `INSTANCE_LETTER`                                    | One lowercase letter reserved for the standalone server                                                                         |
| `JWT_PRIVATE_KEY`                                    | Persistent Ed25519 PKCS#8 private key; secret manager only                                                                      |
| `JWT_KEY_ID`                                         | Stable key identifier                                                                                                           |
| `OPENWAR_AUTH_URL`                                   | HTTPS URL of the private account Worker; keep it server-side                                                                    |
| `OPENWAR_AUTH_SECRET`                                | Shared Worker-to-Render secret; secret manager only                                                                             |
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

## Independent guest identity

Standalone mode provides its own Ed25519 guest-token issuer, public JWKS,
refresh-cookie handling and minimal guest profile. Guest play remains available
without an account. Email/password accounts are an optional layer on top of the
guest identity; Google, Discord and Steam OAuth, purchases, clans, hosted
progression, paid cosmetics and a cross-server registry are not provided by
this self-hosted deployment. Guest identities remain anonymous until attached
to an email/password account.

### Email/password accounts

The independent deployment stores email/password accounts in a dedicated
Cloudflare D1 database in the EU jurisdiction. A private Cloudflare Worker
(`openwar-auth-api`) owns account persistence and password verification; the
Render game server calls it over HTTPS using `OPENWAR_AUTH_SECRET`. The
browser never talks to D1 and never receives the service secret.

- Registration requires the current, server-verified guest token and attaches
  that exact persistent player ID to the account. A client-supplied player ID
  is ignored.
- Login on another device restores the persistent ID stored on the account.
  The game still receives the same Ed25519 JWT format and continues to use the
  existing guest-provider token contract.
- Passwords are stored as salted PBKDF2-HMAC-SHA-256 hashes (600,000 rounds),
  not plaintext. Registration and login are rate-limited by email and source IP.
- The current Pages hostname is a `pages.dev` address and this Cloudflare
  account has no onboarded sending domain. Email verification and password
  reset delivery are therefore **not enabled**. New accounts are marked
  `email_verified = 0`; the email address is a login name only and must not be
  treated as proof of ownership or a verified recovery address.
- Google and Discord remain disabled until OAuth applications, client IDs,
  secrets and callback URLs are configured. The UI shows these methods as
  unavailable instead of simulating a successful sign-in.
- Refresh tokens remain stateless, with the same 30-day cookie behavior
  described above. Individual refresh tokens cannot be revoked server-side
  before expiry; logging out clears the browser cookie, and key rotation
  invalidates every outstanding token.

Set `OPENWAR_AUTH_URL` and `OPENWAR_AUTH_SECRET` only on the Render game
service. Never commit the secret or place it in client bootstrap configuration.
The D1 schema is initialized separately in the `openwar-auth` database.

The access JWT is short-lived. The refresh token is a signed, stateless token
with a 30-day lifetime, delivered in a host-only `__Host-` cookie with
`Secure`, `HttpOnly`, `SameSite=Lax` and `Path=/`. Because this mode has
no server-side session registry, an individual refresh token cannot be
revoked before expiry after theft. Logging out clears the browser cookie;
rotating the signing key invalidates all issued tokens. This is a lightweight
guest identity, not a full account security and recovery system.

The game server applies local username/clan-tag filtering and connection/game
rate limits. Cloudflare Turnstile can be enabled by setting BOTH
`TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`; the server then verifies
challenges directly with Cloudflare. With neither configured, local filtering
and rate limits remain active, but the extra Turnstile challenge is absent.

Do not expose `GAME_ENV=dev` as a public workaround. Development mode accepts
raw persistent IDs rather than production JWTs; standalone production mode
uses signed Ed25519 guest tokens instead.

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
