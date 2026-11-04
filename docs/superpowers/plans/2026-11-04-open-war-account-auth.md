# Open War Account Authentication Implementation Plan

> **For agentic workers:** Execute these tasks in order. Each task should be committed independently after its checks.

**Goal:** Add email/password player accounts to the self-hosted Open War deployment while preserving guest IDs and the game's existing JWT contract.

**Architecture:** A dedicated Cloudflare Worker backed by EU-jurisdiction D1 persists email/password accounts. The existing Node/Express game server calls that Worker using a server-only secret, then issues the same Ed25519 game JWT it already uses for guest sessions. The client adds a register/login panel to the current account modal.

**Tech Stack:** Cloudflare Workers, D1, Web Crypto PBKDF2, Node.js 24, Express 5, TypeScript, Lit, Vitest.

**Spec:** docs/superpowers/specs/2026-11-04-open-war-account-auth-design.md

## Global Constraints

- Keep GAME_ENV=prod and the current same-origin Pages-to-Render proxy topology.
- Do not expose JWT_PRIVATE_KEY, the auth Worker shared secret, OAuth secrets, or database credentials to browser code or public GitHub files.
- Do not change the existing Ed25519 JWT issuer, audience, cookie name, or game token verification contract.
- Preserve the current guest sign-in and refresh path.
- Use PBKDF2-HMAC-SHA-256 and a random per-account salt; never store raw passwords.
- No email verification or password-reset delivery can be activated without a configured sender domain/provider; surface that limitation accurately.
- Google and Discord remain disabled/configuration-gated until provider app credentials and redirect URIs are supplied.

## Review Focus

- Duplicate registration / concurrent registration: the unique email constraint must prevent two accounts from claiming the same address.
- Cross-device login: an existing account must restore the persistent ID stored on that account, not the current guest's ID.
- Guest migration: registration must attach only the persistent ID extracted from a valid guest JWT.
- Rate-limit bypass: vary email casing/whitespace and IP to ensure normalized identities share the same limit key.
- Malformed and oversized inputs: reject invalid emails and passwords outside the supported length before any database write or expensive hash.

---

### Task 1: D1 Worker API and password security

**Files:**
- Create: cloudflare-pages/openwar-auth-worker.mjs
- Create: tests/auth/openwar-auth-worker.test.mjs
- Modify: no existing files in this task.

**Interfaces:**
- Produces internal routes: POST /internal/register, POST /internal/login, and GET /internal/identity?persistentId=<uuid>.
- Requires Authorization: Bearer <INTERNAL_AUTH_SECRET> on every internal route.
- Uses D1 binding DB; exposes no public unauthenticated account endpoints.

- [ ] Step 1: Write failing tests for valid registration, duplicate email, case-insensitive email normalization, correct login, generic wrong-password response, persistent ID restoration, malformed input, and rate limiting.
- [ ] Step 2: Run the worker tests with Node's built-in test runner and confirm expected failures.
- [ ] Step 3: Implement the Worker routes with PBKDF2-HMAC-SHA-256, constant-time hash comparison, prepared D1 statements, unique constraints, and per-email/IP rate limits.
- [ ] Step 4: Run the tests and confirm all Worker security cases pass.
- [ ] Step 5: Deploy the Worker with the D1 binding and an out-of-repository shared secret; initialize schema and verify its health route.

### Task 2: Node game-server integration

**Files:**
- Modify: src/server/SelfHostedApi.ts
- Modify: src/server/ServerEnv.ts
- Test: tests/server/SelfHostedApi.test.ts

**Interfaces:**
- ServerEnv.openWarAuthUrl(): string | undefined
- ServerEnv.openWarAuthSecret(): string
- POST /auth/account/register and POST /auth/account/login accept JSON { email, password } and require a valid guest Bearer token for registration.
- GET /users/@me resolves the verified JWT subject against the auth Worker and includes user.email only for a linked account.

- [ ] Step 1: Write failing API tests for registration preserving the verified guest ID, login restoring the stored ID, invalid Bearer token rejection, generic login failure, and linked identity response.
- [ ] Step 2: Run the targeted tests and confirm they fail for the missing routes.
- [ ] Step 3: Implement the server-to-server Worker client with a bounded timeout, no secret logging, and strict response validation.
- [ ] Step 4: Reuse the existing guest JWT and refresh-cookie issuance after account persistence succeeds.
- [ ] Step 5: Run targeted API tests, typecheck, and server tests.

### Task 3: Account UI and client session handling

**Files:**
- Modify: src/client/Auth.ts
- Modify: src/client/AccountModal.ts
- Test: tests/client/AccountModal.test.ts (or the nearest existing account-modal test file).

**Interfaces:**
- signInToSelfHostedAccount(email: string, password: string, mode: "register" | "login"): Promise<{ok: true; email: string} | {ok: false; error: string}>
- The client sends its current guest JWT only for registration; the browser never receives the Worker shared secret.
- On success, update the in-memory JWT, user settings and userMeResponse without a full reload.

- [ ] Step 1: Add failing tests for guest-to-account registration, existing-account login, validation messages, and preserving guest mode when unauthenticated.
- [ ] Step 2: Run the focused tests and confirm they fail on missing account controls.
- [ ] Step 3: Implement email/password form states with show/hide password, busy/error/success states, keyboard submit, and minimum password length.
- [ ] Step 4: Keep Google and Discord controls configuration-gated; they must show a clear unavailable message until OAuth credentials are configured.
- [ ] Step 5: Run account-modal tests, lint, formatting, and client typecheck.

### Task 4: Deployment configuration and documentation

**Files:**
- Modify: docs/SELF_HOSTING.md
- Create: docs/superpowers/specs/2026-11-04-open-war-account-auth-design.md
- Create: docs/superpowers/plans/2026-11-04-open-war-account-auth.md

- [ ] Step 1: Document required Render variables (OPENWAR_AUTH_URL, OPENWAR_AUTH_SECRET) and the Worker/D1 setup.
- [ ] Step 2: Document the email-verification and OAuth credential prerequisites without placing secrets in the repository.
- [ ] Step 3: Run npm run typecheck, npm test, npm run lint, and npm run format:check where the repository runner is available.
- [ ] Step 4: Deploy the Render service (auto-deploy is disabled), then verify /.well-known/jwks.json, guest refresh, registration, duplicate rejection, login, and /users/@me through the public Pages URL.
