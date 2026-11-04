# Open War Account Authentication — Design

**Date:** 2026-11-04

## Intent

Add durable player accounts to the independent Open War deployment without breaking guest play or invalidating the game server's existing Ed25519 JWT contract. A player should be able to register and sign in using email and password. Google and Discord are intended providers, but they must remain configuration-gated until their OAuth application credentials exist.

## Goals

- Persist email/password accounts in a dedicated account database.
- Preserve an existing guest player's persistent ID when that guest registers.
- Restore the same persistent ID when an existing account signs in on another browser/device, so game identity and any data keyed by it remain stable.
- Keep the existing game JWT issuer, audience, claims, refresh cookie and WebSocket/game verification compatible.
- Return the account email from /users/@me so the existing account UI can present a signed-in identity.
- Apply input validation, password hashing, constant-time hash comparison, rate limiting, and no-store response headers.

## Non-goals and release constraints

- This change does not create Google or Discord OAuth applications. Their client IDs/secrets are not available in the connected deployment, so provider routes and UI must report a clear not-configured state rather than pretending authentication succeeded.
- The Cloudflare account has no DNS zones/custom domain. Transactional email verification and password-reset email cannot be safely activated on the current pages.dev hostname. Accounts therefore retain an explicit unverified-email state; do not claim the address has been verified or offer a nonfunctional reset flow.
- This does not add paid game entitlements, cross-server progression, or change game simulation identity rules.
- Existing guest sessions remain available and are not migrated or revoked.

## Architecture

Browser requests continue to use the same-origin Cloudflare Pages proxy. The Node/Express game server remains the JWT issuer and performs the trusted exchange. A dedicated Cloudflare Worker, bound to a new EU-jurisdiction D1 database, handles account persistence and password verification. The Node server calls this Worker over HTTPS with a server-only shared secret. The browser never receives that secret and never accesses D1 directly.

The account row stores a unique normalized email and a unique Open War persistent player ID. Registration attaches the current, server-verified guest ID; login restores the persistent ID stored for that email. The game server then uses its existing guest-session signing function for that persistent ID, preserving the current JWT contract.

## Approaches considered

1. Render Postgres: would place the account database next to the game server, but the connected Render workspace has no database and the repository has no PostgreSQL runtime driver. This adds a runtime dependency and lockfile/build changes.
2. Cloudflare D1 behind a dedicated Worker (selected): reuses the already-connected Cloudflare account and same deployment edge, avoids shipping database credentials to the browser, keeps the existing Pages front door unchanged, and supports an EU database jurisdiction.
3. Supabase Auth: no Supabase project is connected, so it would require a new provider/project and a second auth/JWT integration.

## Security decisions

- Passwords are stored as salted PBKDF2-HMAC-SHA-256 hashes, never plaintext.
- Account API access from Render to the auth Worker is protected by a secret shared only between those two servers.
- Login errors do not disclose whether an email exists.
- Rate limits are applied per normalized email and source IP.
- User-supplied persistent IDs are not trusted: the Node server derives the registration ID from the verified Bearer JWT.
- The existing refresh token remains stateless in this first release. Individual refresh-session revocation is therefore not added; logout clears the browser cookie, and key rotation invalidates all outstanding tokens.
- Email remains explicitly unverified until a sending domain and delivery provider are configured.

## Acceptance criteria

- New email/password registration returns a game-compatible JWT and preserves the verified guest persistent ID.
- Duplicate email registration is rejected without leaking an unrelated account's data.
- Correct password login restores the same persistent ID; an incorrect password returns a generic unauthorized response.
- /users/@me returns the linked email only after a valid game JWT is verified.
- Guest login and refresh keep working unchanged.
- Registration/login responses are not cached, secrets are not placed in frontend bundles, and authentication requests are rate-limited.
- Google/Discord buttons cannot report success unless corresponding OAuth credentials and callback configuration are present.
