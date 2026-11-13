# Render deployment configuration

The Render web service must not inherit local-development credentials or
security settings from an npm script. Start it with `npm run start:render`;
the launcher loads the service environment, validates it, and then imports the
server.

## Additional public development service found during audit

The connected Render workspace also contains a public web service named
`open-war-game` at `https://open-war-game.onrender.com`. Its start command is
`npm run start:server-dev`, which explicitly sets `GAME_ENV=dev` and documented
development credentials. The service IP allowlist is open to `0.0.0.0/0`.
Treat this as a second P0 exposure until its purpose is confirmed. If it is not
an intentionally public, isolated demo, restrict access or suspend it; if it is
intended to host production game workers, migrate it to the validated Render
launcher with independently verified environment values. Do not change or
suspend it automatically because it may currently serve live game traffic.

## Cluster identity and release readiness

The Render launcher can obtain its instance identity from the upstream cluster
registry when `INSTANCE_LETTER` and `NUM_WORKERS` are both unset. It sends
`POST /cluster/register` with the public page site, game host, and CPU count,
then sets the returned letter and worker count before importing the game
server. If an identity pair is supplied manually, both values must be present
and valid.

After the game server starts its periodic check-in loop, the launcher sends
`POST /cluster/latest` for the deployed 40-character Render commit. Startup
is not considered complete until `GET /cluster.json?site=...` confirms that
the same host, letter, worker count, and version are listed with state
`open`. An unknown site or rejected API key fails startup rather than leaving
a server that serves a page but cannot receive games.

The API registry must recognise the chosen `SITE_HOST`. The default page
identity for a standalone Render web service is
`RENDER_EXTERNAL_HOSTNAME`; set `SITE_HOST` explicitly when the page host is
different from the game socket host. Do not register a fork under
`openfront.io` merely to bypass an `Unknown site` response: that would mix
its game IDs and ranked queues with the upstream OpenFront site.

## Required settings

Configure these values in the Render service's **Environment** page. Do not
commit secret values to Git.

- **`GAME_ENV`**: Explicitly set to `staging` or `prod`. Render refuses
  implicit or accidental `dev` mode.
- **`DOMAIN`**: Public page and JWT audience domain. Do not set this
  to a Render `onrender.com` hostname just to make the API URL work.
- **`OPENWAR_API_ORIGIN`**: Optional HTTPS origin for API transport. When set,
  the server and browser use it for JWKS, matchmaking, cluster check-ins,
  cosmetics, reserved-clan-tag requests, and join verification. It must be an
  absolute HTTPS origin without a path, query string, or credentials. HTTP is
  allowed only for loopback development. This transport setting does not
  change `DOMAIN`, JWT audience, or JWT issuer identity. Without it, the
  default `https://api.<DOMAIN>` origin is used.
- **`API_KEY`**: Valid server-to-API key. Development placeholders are
  rejected.
- **`TURNSTILE_SITE_KEY`**: Site key matching the environment. Production
  rejects the public test key.
- **`NUM_WORKERS`**: Positive integer matching this instance's worker routing.
- **`INSTANCE_LETTER`**: One registered lowercase letter. Never reuse a
  retired letter.

Render supplies `RENDER_GIT_COMMIT`; the launcher always copies this deployed
SHA into `GIT_COMMIT`, even when a stale manual `GIT_COMMIT` is present. This
keeps the UI and server version tied to the running deploy instead of showing
the generic `vx.xx.xx` placeholder.

`ADMIN_BOT_API_KEY` is optional. Leave it unset to disable the admin-bot
endpoint. Do not use the documented development placeholder as a credential.

## Development services

Local runs default to `GAME_ENV=dev` and the public Cloudflare Turnstile test
site key. A Render-hosted development service is refused unless
`ALLOW_INSECURE_RENDER_DEV=true` is explicitly configured. Use that exception
only for an isolated, non-production service.

## Before switching the live service

1. Confirm the API host represented by `DOMAIN` and the corresponding API key.
2. Register/confirm `INSTANCE_LETTER` and `NUM_WORKERS` for the deployment.
3. Set a live Turnstile site key for `GAME_ENV=prod`.
4. Verify the service can reach the configured `API_DOMAIN` (or the derived
   `https://api.<DOMAIN>` when it is unset) from the Render region.
5. Only then change the live service's start configuration and deploy.

## Dependency security gate

The pull-request CI now creates a compatible
`npm audit fix --package-lock-only` candidate, reports remaining advisories,
and verifies the candidate with typecheck, production build, and tests before
uploading the lockfile/report artifact. This does not automatically commit
dependency changes; review the exact advisory report and promote only a tested
candidate.

## Privilege fallback policy

Before the first valid cosmetics and reserved-clan-tag refresh, production now
uses a fail-closed checker: built-in country flags remain available, but
catalog cosmetics and clan tags that cannot be verified are withheld. Local
development keeps the previous fail-open behavior. Once a valid catalog has
loaded, the last known-good checker remains active through later API outages.

## Join verification and admission policy

Both browser and server JWKS retrieval now use the configured API transport origin while JWT issuer/audience validation remains bound to `DOMAIN`. The server-side `/join_verify` request uses that same transport origin and refuses HTTP redirects so the API key cannot be forwarded to a different host. First joins fail closed when Turnstile/name verification is unavailable; an already-admitted reconnect may retain its existing local identity during a verifier outage. The Cloudflare gateway source must include `/join_verify` before `OPENWAR_API_ORIGIN` is switched to that Worker.

## Ranked matchmaking diagnostics

Ranked workers call `https://api.<DOMAIN>/matchmaking/checkin`. When that
request fails, the worker log records the public API hostname and the nested
network error code (for example, a TLS alert). It does not log request headers
or the API key. Confirm that the hostname is the API host for the selected
audience and that outbound TLS to it succeeds from the Render service. Do not
disable certificate validation or downgrade the request to HTTP.

The launcher intentionally does not change Render service settings, domains,
databases, or existing production variables.
