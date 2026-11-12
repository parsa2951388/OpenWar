# Open War API Gateway

This Worker is a narrowly scoped transport gateway for the game server's
server-to-server calls to the existing API at `https://api.openfront.io`.
It does not replace the identity provider, OAuth callbacks, account database,
or matchmaking implementation.

## Routes

- `/matchmaking/checkin`
- `/matchmaking/join` (WebSocket upgrade pass-through)
- `/cluster/checkin`
- `/cluster/lobbies` (WebSocket upgrade pass-through)
- `/cluster.json`
- `/map_weights`
- `/.well-known/jwks.json`
- `/cosmetics.json`
- `/reserved_clan_tags`
- `/users/@me`
- `/__health` (gateway and D1 health only)

All upstream traffic is pinned to `api.openfront.io`; the caller cannot
select an upstream host. Browser origins are restricted to the configured
Open War site and local development origins. Requests without an Origin
header are accepted for server-to-server use.

D1 records only failed upstream requests (route group, HTTP method, status,
duration and timestamp). It never stores credentials, tokens, query strings,
player identifiers or request bodies.

## Deployment

```sh
npx wrangler d1 migrations apply openwar-api-gateway-db --remote
npx wrangler deploy
```

The deployed endpoint is the Worker workers.dev URL. Configure the Render
game server's `OPENWAR_API_ORIGIN` to that URL only after validating its
health and upstream pass-through. `DOMAIN` remains the JWT audience and
`ServerEnv.jwtIssuer()` remains the JWT identity issuer; the gateway changes
the network transport origin only.

## Verification

- `GET /__health` must return HTTP 200 and `storage: "ok"`.
- `GET /.well-known/jwks.json` must proxy the upstream JWKS response.
- `GET /cluster.json?site=...` must proxy the upstream server list.
- Unknown paths and unapproved browser origins must be rejected.
- Matchmaking and lobby WebSocket upgrades must pass through with status 101.

The gateway also forwards `/join_verify` for the server-side Turnstile and
name-verification flow.
