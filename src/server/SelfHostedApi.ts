import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
} from "jose";
import { z } from "zod";
import { UserMeResponseSchema } from "@openfront/shared/ApiSchemas";
import { base64urlToUuid, uuidToBase64url } from "@openfront/shared/Base64";
import {
  checkAuthDatabase,
  getAuthPool,
  withAuthTransaction,
} from "./AuthDatabase";
import type { AuthDbClient } from "./AuthDatabase";
import { verifyClientToken } from "./jwt";
import { ServerEnv } from "./ServerEnv";

type OAuthProvider = "google" | "discord";
type OAuthPurpose = "login" | "link";
type AccountRecord = {
  id: string;
  persistent_id: string;
  status: string;
  email: string | null;
  email_normalized: string | null;
  password_hash: string | null;
};

const GUEST_INPUT = z.object({ persistentId: z.string().uuid() });
const PASSWORD_INPUT = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(10).max(128),
});
const REFRESH_COOKIE = "__Host-openwar_refresh";
const OAUTH_COOKIE = "__Host-openwar_oauth";
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const ACCESS_TTL_SECONDS = 15 * 60;
const OAUTH_TTL_SECONDS = 10 * 60;
const PASSWORD_SCRYPT_N = 32_768;
const PASSWORD_SCRYPT_R = 8;
const PASSWORD_SCRYPT_P = 1;
const PASSWORD_KEY_BYTES = 64;
const scrypt = promisify(scryptCallback);

let signingKey: ReturnType<typeof importPKCS8> | null = null;
let googleJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function privateSigningKey() {
  if (signingKey === null) {
    const pem = ServerEnv.jwtPrivateKey();
    if (!pem) {
      throw new Error("JWT_PRIVATE_KEY is required for account authentication");
    }
    signingKey = importPKCS8(pem, "EdDSA");
  }
  return signingKey;
}

function sha256(value: string | Buffer): Buffer {
  return createHash("sha256").update(value).digest();
}

function equalHash(left: Buffer | null, right: Buffer): boolean {
  return left !== null && left.length === right.length && timingSafeEqual(left, right);
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function cookieValue(req: Request, name: string): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function setRefreshCookie(res: Response, token: string): void {
  res.setHeader(
    "Set-Cookie",
    REFRESH_COOKIE +
      "=" +
      encodeURIComponent(token) +
      "; Max-Age=" +
      REFRESH_TTL_SECONDS +
      "; Path=/; HttpOnly; Secure; SameSite=Lax",
  );
}

function clearRefreshCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    REFRESH_COOKIE + "=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
  );
}

function setOAuthCookie(res: Response, token: string): void {
  res.setHeader(
    "Set-Cookie",
    OAUTH_COOKIE +
      "=" +
      encodeURIComponent(token) +
      "; Max-Age=" +
      OAUTH_TTL_SECONDS +
      "; Path=/; HttpOnly; Secure; SameSite=Lax",
  );
}

function clearOAuthCookie(res: Response): void {
  res.append(
    "Set-Cookie",
    OAUTH_COOKIE + "=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
  );
}

function setNoStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function requestOriginAllowed(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin) return true;
  if (origin === "app://openfront") return true;
  try {
    return new URL(origin).origin === ServerEnv.authPublicOrigin();
  } catch {
    return false;
  }
}

function requireAllowedOrigin(req: Request, res: Response): boolean {
  if (requestOriginAllowed(req)) return true;
  res.status(403).json({ error: "origin_not_allowed" });
  return false;
}

function bearerToken(req: Request): string | null {
  const value = req.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

async function authenticateRequest(
  req: Request,
): Promise<{ persistentId: string; provider: string } | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const verified = await verifyClientToken(token);
  if (
    verified.type !== "success" ||
    !verified.claims ||
    !["guest", "account"].includes(verified.claims.provider ?? "")
  ) {
    return null;
  }
  return {
    persistentId: verified.persistentId,
    provider: verified.claims.provider ?? "guest",
  };
}

async function audit(
  client: AuthDbClient,
  eventType: string,
  accountId: string | null,
  req: Request,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await client.query(
    "INSERT INTO auth_audit_events (account_id, event_type, occurred_at, request_id, metadata) VALUES ($1, $2, now(), $3, $4::jsonb)",
    [
      accountId,
      eventType,
      req.get("cf-ray") ?? null,
      JSON.stringify(metadata),
    ],
  );
}

function clientIpHash(req: Request): Buffer | null {
  const ip = req.ip;
  return ip ? sha256(ip) : null;
}

async function ensurePlayerAccount(
  client: AuthDbClient,
  persistentId: string,
): Promise<AccountRecord> {
  const existing = await client.query<AccountRecord>(
    "SELECT a.id, ap.persistent_id, a.status, a.email, a.email_normalized, a.password_hash FROM auth_account_players ap JOIN auth_accounts a ON a.id = ap.account_id WHERE ap.persistent_id = $1 FOR UPDATE OF a",
    [persistentId],
  );
  if (existing.rows[0]) {
    if (existing.rows[0].status !== "active") {
      throw new Error("account_unavailable");
    }
    return existing.rows[0];
  }

  const accountId = randomUUID();
  await client.query(
    "INSERT INTO auth_accounts (id, status, created_at, updated_at) VALUES ($1, 'active', now(), now())",
    [accountId],
  );
  await client.query(
    "INSERT INTO auth_account_players (account_id, persistent_id, linked_at) VALUES ($1, $2, now())",
    [accountId, persistentId],
  );

  return {
    id: accountId,
    persistent_id: persistentId,
    status: "active",
    email: null,
    email_normalized: null,
    password_hash: null,
  };
}

async function persistentIdForAccount(
  client: AuthDbClient,
  accountId: string,
): Promise<string> {
  const found = await client.query<{ persistent_id: string }>(
    "SELECT persistent_id FROM auth_account_players WHERE account_id = $1 FOR UPDATE",
    [accountId],
  );
  if (found.rows[0]) return found.rows[0].persistent_id;

  const persistentId = randomUUID();
  await client.query(
    "INSERT INTO auth_account_players (account_id, persistent_id, linked_at) VALUES ($1, $2, now())",
    [accountId, persistentId],
  );
  return persistentId;
}

async function signAccessToken(persistentId: string): Promise<string> {
  return new SignJWT({ provider: "account", token_use: "access" })
    .setProtectedHeader({
      alg: "EdDSA",
      typ: "JWT",
      kid: ServerEnv.jwtKeyId(),
    })
    .setIssuer(ServerEnv.jwtIssuer())
    .setAudience(ServerEnv.jwtAudience())
    .setSubject(uuidToBase64url(persistentId))
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL_SECONDS + "s")
    .sign(await privateSigningKey());
}

async function sendSession(
  res: Response,
  accountId: string,
  persistentId: string,
  req: Request,
): Promise<void> {
  const refreshToken = randomToken();
  const refreshHash = sha256(refreshToken);
  const sessionId = randomUUID();
  const familyId = randomUUID();
  const userAgent = (req.get("user-agent") ?? "").slice(0, 512) || null;
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

  await withAuthTransaction(async (client) => {
    await client.query(
      "INSERT INTO auth_sessions (id, account_id, token_family_id, refresh_token_hash, token_generation, created_at, expires_at, user_agent, created_ip_hash) VALUES ($1, $2, $3, $4, 0, now(), $5, $6, $7)",
      [sessionId, accountId, familyId, refreshHash, expiresAt, userAgent, clientIpHash(req)],
    );
    await client.query(
      "INSERT INTO auth_refresh_token_history (id, session_id, token_hash, token_generation, issued_at) VALUES ($1, $2, $3, 0, now())",
      [randomUUID(), sessionId, refreshHash],
    );
    await client.query(
      "UPDATE auth_accounts SET last_authenticated_at = now(), updated_at = now() WHERE id = $1",
      [accountId],
    );
    await audit(client, "session_created", accountId, req, {
      sessionId,
      persistentId,
    });
  });

  const jwt = await signAccessToken(persistentId);
  setRefreshCookie(res, refreshToken);
  setNoStore(res);
  res.json({ jwt, expiresIn: ACCESS_TTL_SECONDS });
}

async function passwordHash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, PASSWORD_KEY_BYTES, {
    N: PASSWORD_SCRYPT_N,
    r: PASSWORD_SCRYPT_R,
    p: PASSWORD_SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer;

  return [
    "scrypt",
    PASSWORD_SCRYPT_N,
    PASSWORD_SCRYPT_R,
    PASSWORD_SCRYPT_P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

async function verifyPassword(
  password: string,
  encoded: string | null,
): Promise<boolean> {
  if (!encoded) {
    // Equalize the expensive path for unknown emails and accounts without a password.
    await passwordHash(password);
    return false;
  }

  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    n < 16_384 ||
    n > 65_536 ||
    r < 1 ||
    r > 16 ||
    p < 1 ||
    p > 4
  ) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64url");
    expected = Buffer.from(parts[5], "base64url");
  } catch {
    return false;
  }
  if (salt.length < 16 || expected.length !== PASSWORD_KEY_BYTES) return false;

  const actual = (await scrypt(password, salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer;
  return timingSafeEqual(actual, expected);
}

function oauthEncryptionKey(): Buffer {
  return sha256(ServerEnv.jwtPrivateKey() + "|open-war-oauth-code-verifier-v1");
}

function encryptVerifier(value: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", oauthEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

function decryptVerifier(value: Buffer): string {
  if (value.length < 29) throw new Error("invalid_oauth_verifier");
  const iv = value.subarray(0, 12);
  const tag = value.subarray(12, 28);
  const ciphertext = value.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", oauthEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "discord";
}

function providerConfigured(provider: OAuthProvider): boolean {
  return provider === "google"
    ? Boolean(ServerEnv.googleOAuthClientId() && ServerEnv.googleOAuthClientSecret())
    : Boolean(ServerEnv.discordOAuthClientId() && ServerEnv.discordOAuthClientSecret());
}

function safeReturnPath(candidate: string | undefined): string {
  if (!candidate) return "/";
  try {
    const url = new URL(candidate, ServerEnv.authPublicOrigin());
    if (url.origin !== ServerEnv.authPublicOrigin()) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

function providerCallbackUrl(provider: OAuthProvider): string {
  return ServerEnv.authPublicOrigin() + "/auth/callback/" + provider;
}

function appendResult(returnPath: string, key: string, value: string): string {
  const url = new URL(returnPath, ServerEnv.authPublicOrigin());
  url.searchParams.set(key, value);
  return url.pathname + url.search + url.hash;
}

async function beginOAuth(
  req: Request,
  res: Response,
  provider: OAuthProvider,
  purpose: OAuthPurpose,
  account: AccountRecord | null,
): Promise<void> {
  if (!providerConfigured(provider)) {
    res.status(503).json({ error: "oauth_provider_not_configured" });
    return;
  }

  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();
  const binding = randomToken();
  const challenge = sha256(verifier).toString("base64url");
  const returnPath = safeReturnPath(
    typeof req.query.redirect_uri === "string"
      ? req.query.redirect_uri
      : typeof req.query.return_to === "string"
        ? req.query.return_to
        : "/",
  );

  await getAuthPool().query(
    "INSERT INTO auth_oauth_transactions (id, provider, purpose, account_id, state_hash, nonce_hash, code_verifier_ciphertext, return_path, created_at, expires_at, persistent_id, browser_binding_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now() + ($9 || ' seconds')::interval, $10, $11)",
    [
      randomUUID(),
      provider,
      purpose,
      account?.id ?? null,
      sha256(state),
      sha256(nonce),
      encryptVerifier(verifier),
      returnPath,
      String(OAUTH_TTL_SECONDS),
      account?.persistent_id ?? null,
      sha256(binding),
    ],
  );

  setOAuthCookie(res, binding);
  setNoStore(res);

  const target =
    provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL("https://discord.com/oauth2/authorize");

  target.searchParams.set(
    "client_id",
    provider === "google"
      ? ServerEnv.googleOAuthClientId()
      : ServerEnv.discordOAuthClientId(),
  );
  target.searchParams.set("response_type", "code");
  target.searchParams.set("redirect_uri", providerCallbackUrl(provider));
  target.searchParams.set("scope", provider === "google" ? "openid email profile" : "identify email");
  target.searchParams.set("state", state);
  target.searchParams.set("code_challenge", challenge);
  target.searchParams.set("code_challenge_method", "S256");

  if (provider === "google") {
    target.searchParams.set("nonce", nonce);
    target.searchParams.set("prompt", "select_account");
  } else {
    target.searchParams.set("prompt", "consent");
  }

  res.json({ url: target.toString() });
}

async function consumeOAuthTransaction(
  req: Request,
  provider: OAuthProvider,
): Promise<{
  id: string;
  purpose: OAuthPurpose;
  account_id: string | null;
  persistent_id: string | null;
  return_path: string;
  nonce_hash: Buffer;
  code_verifier_ciphertext: Buffer;
} | null> {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const binding = cookieValue(req, OAUTH_COOKIE);
  if (!state || !binding) return null;

  return withAuthTransaction(async (client) => {
    const found = await client.query<{
      id: string;
      purpose: OAuthPurpose;
      account_id: string | null;
      persistent_id: string | null;
      return_path: string;
      nonce_hash: Buffer;
      code_verifier_ciphertext: Buffer;
      expires_at: Date;
      consumed_at: Date | null;
      browser_binding_hash: Buffer | null;
    }>(
      "SELECT id, purpose, account_id, persistent_id, return_path, nonce_hash, code_verifier_ciphertext, expires_at, consumed_at, browser_binding_hash FROM auth_oauth_transactions WHERE provider = $1 AND state_hash = $2 FOR UPDATE",
      [provider, sha256(state)],
    );
    const transaction = found.rows[0];
    if (
      !transaction ||
      transaction.consumed_at ||
      new Date(transaction.expires_at).getTime() <= Date.now() ||
      !equalHash(transaction.browser_binding_hash, sha256(binding))
    ) {
      return null;
    }

    await client.query(
      "UPDATE auth_oauth_transactions SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL",
      [transaction.id],
    );

    return {
      id: transaction.id,
      purpose: transaction.purpose,
      account_id: transaction.account_id,
      persistent_id: transaction.persistent_id,
      return_path: safeReturnPath(transaction.return_path),
      nonce_hash: transaction.nonce_hash,
      code_verifier_ciphertext: transaction.code_verifier_ciphertext,
    };
  });
}

type OAuthProfile = {
  provider: OAuthProvider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  profile: Record<string, unknown>;
};

async function exchangeGoogleCode(
  code: string,
  verifier: string,
  nonceHash: Buffer,
): Promise<OAuthProfile> {
  const body = new URLSearchParams({
    code,
    client_id: ServerEnv.googleOAuthClientId(),
    client_secret: ServerEnv.googleOAuthClientSecret(),
    redirect_uri: providerCallbackUrl("google"),
    grant_type: "authorization_code",
    code_verifier: verifier,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("google_token_exchange_failed");

  const tokens = (await response.json()) as { id_token?: unknown };
  if (typeof tokens.id_token !== "string") {
    throw new Error("google_id_token_missing");
  }

  googleJwks ??= createRemoteJWKSet(
    new URL("https://www.googleapis.com/oauth2/v3/certs"),
  );
  const verified = await jwtVerify(tokens.id_token, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: ServerEnv.googleOAuthClientId(),
    clockTolerance: 5,
  });
  const payload = verified.payload;
  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    payload.email_verified !== true ||
    typeof payload.nonce !== "string" ||
    !equalHash(nonceHash, sha256(payload.nonce))
  ) {
    throw new Error("google_identity_claims_invalid");
  }

  return {
    provider: "google",
    subject: payload.sub,
    email: payload.email,
    emailVerified: true,
    displayName: typeof payload.name === "string" ? payload.name : null,
    avatarUrl: typeof payload.picture === "string" ? payload.picture : null,
    profile: {
      name: typeof payload.name === "string" ? payload.name : null,
      picture: typeof payload.picture === "string" ? payload.picture : null,
      locale: typeof payload.locale === "string" ? payload.locale : null,
    },
  };
}

async function exchangeDiscordCode(
  code: string,
  verifier: string,
): Promise<OAuthProfile> {
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: providerCallbackUrl("discord"),
    code_verifier: verifier,
  });
  const credentials = Buffer.from(
    ServerEnv.discordOAuthClientId() + ":" + ServerEnv.discordOAuthClientSecret(),
  ).toString("base64");
  const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + credentials,
    },
    body,
    signal: AbortSignal.timeout(12_000),
  });
  if (!tokenResponse.ok) throw new Error("discord_token_exchange_failed");

  const tokens = (await tokenResponse.json()) as { access_token?: unknown };
  if (typeof tokens.access_token !== "string") {
    throw new Error("discord_access_token_missing");
  }

  const profileResponse = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: "Bearer " + tokens.access_token },
    signal: AbortSignal.timeout(12_000),
  });
  if (!profileResponse.ok) throw new Error("discord_profile_fetch_failed");

  const profile = (await profileResponse.json()) as Record<string, unknown>;
  if (typeof profile.id !== "string" || typeof profile.username !== "string") {
    throw new Error("discord_profile_invalid");
  }

  const avatar =
    typeof profile.avatar === "string" && profile.avatar.length > 0
      ? "https://cdn.discordapp.com/avatars/" +
        profile.id +
        "/" +
        profile.avatar +
        ".png"
      : null;

  return {
    provider: "discord",
    subject: profile.id,
    email: typeof profile.email === "string" ? profile.email : null,
    emailVerified: profile.verified === true && typeof profile.email === "string",
    displayName:
      typeof profile.global_name === "string"
        ? profile.global_name
        : profile.username,
    avatarUrl: avatar,
    profile: {
      username: profile.username,
      global_name:
        typeof profile.global_name === "string" ? profile.global_name : null,
      discriminator:
        typeof profile.discriminator === "string" ? profile.discriminator : "0",
      avatar: typeof profile.avatar === "string" ? profile.avatar : null,
    },
  };
}

async function attachOAuthIdentity(
  transaction: {
    purpose: OAuthPurpose;
    account_id: string | null;
    persistent_id: string | null;
  },
  identity: OAuthProfile,
  req: Request,
): Promise<{ accountId: string; persistentId: string }> {
  return withAuthTransaction(async (client) => {
    const linkedIdentity = await client.query<{
      account_id: string;
    }>(
      "SELECT account_id FROM auth_account_identities WHERE provider = $1 AND provider_subject = $2 FOR UPDATE",
      [identity.provider, identity.subject],
    );

    let accountId: string;
    if (linkedIdentity.rows[0]) {
      accountId = linkedIdentity.rows[0].account_id;
      if (
        transaction.purpose === "link" &&
        transaction.account_id !== accountId
      ) {
        throw new Error("identity_already_linked");
      }
      if (
        transaction.purpose === "link" &&
        transaction.account_id === accountId
      ) {
        // Same provider identity linked twice: the operation is idempotent.
      }
    } else if (transaction.purpose === "link") {
      if (!transaction.account_id) throw new Error("oauth_link_account_missing");
      accountId = transaction.account_id;

      const account = await client.query<{ id: string; status: string }>(
        "SELECT id, status FROM auth_accounts WHERE id = $1 FOR UPDATE",
        [accountId],
      );
      if (!account.rows[0] || account.rows[0].status !== "active") {
        throw new Error("account_unavailable");
      }

      const existingProvider = await client.query<{ provider_subject: string }>(
        "SELECT provider_subject FROM auth_account_identities WHERE account_id = $1 AND provider = $2 FOR UPDATE",
        [accountId, identity.provider],
      );
      if (existingProvider.rows[0]) {
        throw new Error("provider_already_linked");
      }

      await client.query(
        "INSERT INTO auth_account_identities (id, account_id, provider, provider_subject, provider_email, provider_email_verified, display_name, avatar_url, provider_profile, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now(), now())",
        [
          randomUUID(),
          accountId,
          identity.provider,
          identity.subject,
          identity.email,
          identity.emailVerified,
          identity.displayName,
          identity.avatarUrl,
          JSON.stringify(identity.profile),
        ],
      );

      if (identity.emailVerified && identity.email) {
        const normalized = normalizeEmail(identity.email);
        await client.query(
          "UPDATE auth_accounts SET email = COALESCE(email, $2), email_normalized = COALESCE(email_normalized, $3), email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1 AND (email_normalized IS NULL OR email_normalized = $3)",
          [accountId, identity.email, normalized],
        );
      }
    } else {
      // A verified provider email is not silently merged into a different
      // Open War account. The player must sign in to that account and link the
      // provider from there, which prevents accidental and ambiguous merges.
      if (identity.emailVerified && identity.email) {
        const emailOwner = await client.query<{ id: string }>(
          "SELECT id FROM auth_accounts WHERE email_normalized = $1 FOR UPDATE",
          [normalizeEmail(identity.email)],
        );
        if (emailOwner.rows[0]) throw new Error("email_already_registered");
      }

      accountId = randomUUID();
      await client.query(
        "INSERT INTO auth_accounts (id, email, email_normalized, email_verified_at, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'active', now(), now())",
        [
          accountId,
          identity.emailVerified ? identity.email : null,
          identity.emailVerified && identity.email
            ? normalizeEmail(identity.email)
            : null,
          identity.emailVerified ? new Date() : null,
        ],
      );
      await client.query(
        "INSERT INTO auth_account_identities (id, account_id, provider, provider_subject, provider_email, provider_email_verified, display_name, avatar_url, provider_profile, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now(), now())",
        [
          randomUUID(),
          accountId,
          identity.provider,
          identity.subject,
          identity.email,
          identity.emailVerified,
          identity.displayName,
          identity.avatarUrl,
          JSON.stringify(identity.profile),
        ],
      );
    }

    const account = await client.query<{ status: string }>(
      "SELECT status FROM auth_accounts WHERE id = $1 FOR UPDATE",
      [accountId],
    );
    if (!account.rows[0] || account.rows[0].status !== "active") {
      throw new Error("account_unavailable");
    }

    let persistentId: string;
    if (transaction.purpose === "link" && transaction.persistent_id) {
      persistentId = transaction.persistent_id;
    } else {
      persistentId = await persistentIdForAccount(client, accountId);
    }

    const accountPlayer = await client.query<{ persistent_id: string }>(
      "SELECT persistent_id FROM auth_account_players WHERE account_id = $1 FOR UPDATE",
      [accountId],
    );
    if (!accountPlayer.rows[0]) {
      await client.query(
        "INSERT INTO auth_account_players (account_id, persistent_id, linked_at) VALUES ($1, $2, now())",
        [accountId, persistentId],
      );
    } else {
      persistentId = accountPlayer.rows[0].persistent_id;
    }

    await audit(client, transaction.purpose === "link" ? "identity_linked" : "oauth_login", accountId, req, {
      provider: identity.provider,
      providerSubjectHash: sha256(identity.subject).toString("hex"),
    });

    return { accountId, persistentId };
  });
}

async function currentAccountForLink(
  req: Request,
): Promise<AccountRecord | null> {
  const auth = await authenticateRequest(req);
  if (!auth) return null;

  return withAuthTransaction(async (client) =>
    ensurePlayerAccount(client, auth.persistentId),
  );
}

async function respondWithUserMe(
  req: Request,
  res: Response,
): Promise<void> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "missing_token" });
    return;
  }

  const auth = await verifyClientToken(token);
  if (
    auth.type !== "success" ||
    !auth.claims ||
    !["guest", "account"].includes(auth.claims.provider ?? "")
  ) {
    res.status(401).json({ error: "invalid_session" });
    return;
  }

  const userResult = await getAuthPool().query<{
    email: string | null;
    status: string;
    provider: OAuthProvider;
    provider_subject: string;
    provider_email: string | null;
    display_name: string | null;
    avatar_url: string | null;
    provider_profile: Record<string, unknown> | null;
  }>(
    "SELECT a.email, a.status, i.provider, i.provider_subject, i.provider_email, i.display_name, i.avatar_url, i.provider_profile FROM auth_account_players ap JOIN auth_accounts a ON a.id = ap.account_id LEFT JOIN auth_account_identities i ON i.account_id = a.id WHERE ap.persistent_id = $1",
    [auth.persistentId],
  );

  if (userResult.rows.length === 0) {
    await withAuthTransaction((client) => ensurePlayerAccount(client, auth.persistentId));
  }

  const refreshed = userResult.rows;
  const accountStatus = refreshed[0]?.status ?? "active";
  if (accountStatus !== "active") {
    res.status(403).json({ error: "account_unavailable" });
    return;
  }

  const user: Record<string, unknown> = {};
  for (const row of refreshed) {
    if (row.provider === "google") {
      user.google = { email: row.provider_email ?? "" };
    } else if (row.provider === "discord") {
      const profile = row.provider_profile ?? {};
      user.discord = {
        id: row.provider_subject,
        avatar: profile.avatar_url ?? profile.avatar ?? null,
        username:
          typeof profile.username === "string"
            ? profile.username
            : row.display_name ?? "Discord user",
        global_name:
          typeof profile.global_name === "string"
            ? profile.global_name
            : null,
        discriminator:
          typeof profile.discriminator === "string"
            ? profile.discriminator
            : "0",
      };
    }
  }
  if (refreshed[0]?.email) user.email = refreshed[0].email;

  const player = {
    publicId: auth.persistentId,
    adfree: false,
    canCreatePublicLobbies: false,
    achievements: { singleplayerMap: [], player: [] },
    friends: [],
    subscription: null,
  };
  const profile = UserMeResponseSchema.parse({ user, player });

  setNoStore(res);
  res.json(profile);
}

async function migrateLegacyRefreshToken(
  token: string,
  req: Request,
  res: Response,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(
      token,
      await ServerEnv.jwkPublicKey(),
      {
        algorithms: ["EdDSA"],
        issuer: ServerEnv.jwtIssuer(),
        audience: ServerEnv.jwtAudience(),
      },
    );
    if (
      payload.token_use !== "refresh" ||
      payload.provider !== "guest" ||
      typeof payload.sub !== "string"
    ) {
      return false;
    }
    const persistentId = base64urlToUuid(payload.sub);
    if (!z.string().uuid().safeParse(persistentId).success) return false;

    const account = await withAuthTransaction((client) =>
      ensurePlayerAccount(client, persistentId),
    );
    await sendSession(res, account.id, persistentId, req);
    return true;
  } catch {
    return false;
  }
}

async function refreshSession(
  req: Request,
  res: Response,
): Promise<void> {
  const token = cookieValue(req, REFRESH_COOKIE);
  if (!token) {
    clearRefreshCookie(res);
    res.status(401).json({ error: "refresh_session_missing" });
    return;
  }

  const tokenHash = sha256(token);
  const result = await withAuthTransaction(async (client) => {
    const found = await client.query<{
      history_id: string;
      used_at: Date | null;
      history_generation: number;
      session_id: string;
      account_id: string;
      token_family_id: string;
      current_hash: Buffer;
      current_generation: number;
      revoked_at: Date | null;
      expires_at: Date;
      status: string;
      persistent_id: string;
    }>(
      "SELECT h.id AS history_id, h.used_at, h.token_generation AS history_generation, s.id AS session_id, s.account_id, s.token_family_id, s.refresh_token_hash AS current_hash, s.token_generation AS current_generation, s.revoked_at, s.expires_at, a.status, ap.persistent_id FROM auth_refresh_token_history h JOIN auth_sessions s ON s.id = h.session_id JOIN auth_accounts a ON a.id = s.account_id JOIN auth_account_players ap ON ap.account_id = a.id WHERE h.token_hash = $1 FOR UPDATE OF h, s, a",
      [tokenHash],
    );
    const row = found.rows[0];
    if (!row) return { kind: "missing" as const };

    if (
      row.used_at ||
      row.revoked_at ||
      new Date(row.expires_at).getTime() <= Date.now() ||
      row.status !== "active" ||
      row.history_generation !== row.current_generation ||
      !equalHash(row.current_hash, tokenHash)
    ) {
      if (row.used_at) {
        await client.query(
          "UPDATE auth_sessions SET revoked_at = now(), revoke_reason = 'refresh_token_reuse' WHERE token_family_id = $1 AND revoked_at IS NULL",
          [row.token_family_id],
        );
        await audit(client, "refresh_reuse_detected", row.account_id, req, {
          sessionId: row.session_id,
          tokenGeneration: row.history_generation,
        });
      } else {
        await client.query(
          "UPDATE auth_sessions SET revoked_at = now(), revoke_reason = 'invalid_refresh_state' WHERE id = $1 AND revoked_at IS NULL",
          [row.session_id],
        );
      }
      return { kind: "invalid" as const };
    }

    const nextToken = randomToken();
    const nextHash = sha256(nextToken);
    const nextGeneration = row.current_generation + 1;
    await client.query(
      "UPDATE auth_refresh_token_history SET used_at = now() WHERE id = $1 AND used_at IS NULL",
      [row.history_id],
    );
    await client.query(
      "UPDATE auth_sessions SET refresh_token_hash = $2, token_generation = $3, last_used_at = now(), rotated_at = now(), expires_at = now() + ($4 || ' seconds')::interval WHERE id = $1",
      [row.session_id, nextHash, nextGeneration, String(REFRESH_TTL_SECONDS)],
    );
    await client.query(
      "INSERT INTO auth_refresh_token_history (id, session_id, token_hash, token_generation, issued_at) VALUES ($1, $2, $3, $4, now())",
      [randomUUID(), row.session_id, nextHash, nextGeneration],
    );
    await client.query(
      "UPDATE auth_accounts SET last_authenticated_at = now(), updated_at = now() WHERE id = $1",
      [row.account_id],
    );

    return {
      kind: "ok" as const,
      token: nextToken,
      accountId: row.account_id,
      persistentId: row.persistent_id,
    };
  });

  if (result.kind === "missing") {
    if (await migrateLegacyRefreshToken(token, req, res)) return;
    clearRefreshCookie(res);
    res.status(401).json({ error: "refresh_session_invalid" });
    return;
  }
  if (result.kind !== "ok") {
    clearRefreshCookie(res);
    res.status(401).json({ error: "refresh_session_invalid" });
    return;
  }

  const jwt = await signAccessToken(result.persistentId);
  setRefreshCookie(res, result.token);
  setNoStore(res);
  res.json({ jwt, expiresIn: ACCESS_TTL_SECONDS });
}

async function revokeSession(
  req: Request,
  res: Response,
  allSessions: boolean,
): Promise<void> {
  const token = cookieValue(req, REFRESH_COOKIE);
  if (token) {
    const hash = sha256(token);
    await withAuthTransaction(async (client) => {
      const found = await client.query<{ account_id: string; id: string }>(
        "SELECT id, account_id FROM auth_sessions WHERE refresh_token_hash = $1 FOR UPDATE",
        [hash],
      );
      const session = found.rows[0];
      if (!session) return;

      if (allSessions) {
        await client.query(
          "UPDATE auth_sessions SET revoked_at = now(), revoke_reason = 'user_logout_all' WHERE account_id = $1 AND revoked_at IS NULL",
          [session.account_id],
        );
        await audit(client, "all_sessions_revoked", session.account_id, req);
      } else {
        await client.query(
          "UPDATE auth_sessions SET revoked_at = now(), revoke_reason = 'user_logout' WHERE id = $1 AND revoked_at IS NULL",
          [session.id],
        );
        await audit(client, "session_revoked", session.account_id, req);
      }
    });
  }
  clearRefreshCookie(res);
  setNoStore(res);
  res.status(204).end();
}

function registerLegacyGuestRoutes(app: Express): void {
  app.post("/auth/guest", async (req, res) => {
    const parsed = GUEST_INPUT.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_guest_identity" });
      return;
    }
    try {
      const persistentId = parsed.data.persistentId;
      const access = await new SignJWT({ provider: "guest", token_use: "access" })
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid: ServerEnv.jwtKeyId() })
        .setIssuer(ServerEnv.jwtIssuer())
        .setAudience(ServerEnv.jwtAudience())
        .setSubject(uuidToBase64url(persistentId))
        .setJti(randomUUID())
        .setIssuedAt()
        .setExpirationTime(ACCESS_TTL_SECONDS + "s")
        .sign(await privateSigningKey());
      const refresh = await new SignJWT({ provider: "guest", token_use: "refresh" })
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid: ServerEnv.jwtKeyId() })
        .setIssuer(ServerEnv.jwtIssuer())
        .setAudience(ServerEnv.jwtAudience())
        .setSubject(uuidToBase64url(persistentId))
        .setJti(randomUUID())
        .setIssuedAt()
        .setExpirationTime(REFRESH_TTL_SECONDS + "s")
        .sign(await privateSigningKey());
      setRefreshCookie(res, refresh);
      setNoStore(res);
      res.json({ jwt: access, expiresIn: ACCESS_TTL_SECONDS });
    } catch (error) {
      res.status(503).json({ error: "guest_auth_unavailable" });
    }
  });

  app.post("/auth/refresh", async (req, res) => {
    const token = cookieValue(req, REFRESH_COOKIE);
    if (!token) {
      clearRefreshCookie(res);
      res.status(401).json({ error: "refresh_session_missing" });
      return;
    }
    try {
      const { payload } = await jwtVerify(token, await ServerEnv.jwkPublicKey(), {
        algorithms: ["EdDSA"],
        issuer: ServerEnv.jwtIssuer(),
        audience: ServerEnv.jwtAudience(),
      });
      if (payload.token_use !== "refresh" || typeof payload.sub !== "string") {
        throw new Error("invalid_refresh_token");
      }
      const persistentId = base64urlToUuid(payload.sub);
      if (!z.string().uuid().safeParse(persistentId).success) {
        throw new Error("invalid_refresh_subject");
      }
      const jwt = await new SignJWT({ provider: "guest", token_use: "access" })
        .setProtectedHeader({ alg: "EdDSA", typ: "JWT", kid: ServerEnv.jwtKeyId() })
        .setIssuer(ServerEnv.jwtIssuer())
        .setAudience(ServerEnv.jwtAudience())
        .setSubject(uuidToBase64url(persistentId))
        .setJti(randomUUID())
        .setIssuedAt()
        .setExpirationTime(ACCESS_TTL_SECONDS + "s")
        .sign(await privateSigningKey());
      setNoStore(res);
      res.json({ jwt, expiresIn: ACCESS_TTL_SECONDS });
    } catch {
      clearRefreshCookie(res);
      res.status(401).json({ error: "refresh_session_invalid" });
    }
  });

  const logout = (_req: Request, res: Response) => {
    clearRefreshCookie(res);
    setNoStore(res);
    res.status(204).end();
  };
  app.post("/auth/logout", logout);
  app.post("/auth/revoke", logout);

  app.get("/users/@me", async (req, res) => {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "missing_token" });
      return;
    }
    const auth = await verifyClientToken(token);
    if (auth.type !== "success" || auth.claims?.provider !== "guest") {
      res.status(401).json({ error: "guest_session_required" });
      return;
    }
    const profile = UserMeResponseSchema.parse({
      user: {},
      player: {
        publicId: auth.persistentId,
        adfree: false,
        canCreatePublicLobbies: false,
        achievements: { singleplayerMap: [], player: [] },
        friends: [],
        subscription: null,
      },
    });
    setNoStore(res);
    res.json(profile);
  });
}

export function registerSelfHostedApi(app: Express): void {
  if (!ServerEnv.selfHostedAuthEnabled()) return;

  app.get("/.well-known/jwks.json", async (_req, res) => {
    try {
      const key = await ServerEnv.jwkPublicKey();
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json({
        keys: [
          {
            ...key,
            alg: "EdDSA",
            use: "sig",
            kid: ServerEnv.jwtKeyId(),
          },
        ],
      });
    } catch {
      res.status(503).json({ error: "signing_key_unavailable" });
    }
  });

  if (!ServerEnv.accountAuthEnabled()) {
    registerLegacyGuestRoutes(app);
  } else {
    registerAccountAuthRoutes(app);
  }

  app.get("/cluster.json", (_req, res) => {
    res.status(404).json({ error: "single_server_deployment" });
  });
}

function registerAccountAuthRoutes(app: Express): void {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 12,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  const guestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  app.get("/auth/status", async (_req, res) => {
    const databaseReady = await checkAuthDatabase();
    setNoStore(res);
    res.status(databaseReady ? 200 : 503).json({
      enabled: true,
      database: databaseReady ? "ready" : "unavailable",
      providers: {
        google: providerConfigured("google"),
        discord: providerConfigured("discord"),
      },
    });
  });

  app.post("/auth/guest", guestLimiter, async (req, res) => {
    if (!requireAllowedOrigin(req, res)) return;
    const parsed = GUEST_INPUT.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_guest_identity" });
      return;
    }
    try {
      const account = await withAuthTransaction((client) =>
        ensurePlayerAccount(client, parsed.data.persistentId),
      );
      await sendSession(res, account.id, parsed.data.persistentId, req);
    } catch (error) {
      console.error("Guest account creation failed", error);
      res.status(503).json({ error: "guest_auth_unavailable" });
    }
  });

  app.post("/auth/refresh", guestLimiter, async (req, res) => {
    if (!requireAllowedOrigin(req, res)) return;
    try {
      await refreshSession(req, res);
    } catch (error) {
      console.error("Session refresh failed", error);
      clearRefreshCookie(res);
      res.status(503).json({ error: "session_refresh_unavailable" });
    }
  });

  app.post("/auth/logout", guestLimiter, async (req, res) => {
    if (!requireAllowedOrigin(req, res)) return;
    try {
      await revokeSession(req, res, false);
    } catch (error) {
      console.error("Logout failed", error);
      clearRefreshCookie(res);
      res.status(204).end();
    }
  });

  app.post("/auth/revoke", authLimiter, async (req, res) => {
    if (!requireAllowedOrigin(req, res)) return;
    try {
      await revokeSession(req, res, true);
    } catch (error) {
      console.error("Session revocation failed", error);
      clearRefreshCookie(res);
      res.status(204).end();
    }
  });

  app.post("/auth/register", authLimiter, async (req, res) => {
    if (!requireAllowedOrigin(req, res)) return;
    const parsed = PASSWORD_INPUT.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "invalid_registration",
        message: "Use a valid email address and a password of at least 10 characters.",
      });
      return;
    }

    const auth = await authenticateRequest(req);
    if (!auth) {
      res.status(401).json({ error: "guest_session_required" });
      return;
    }

    const email = parsed.data.email.trim();
    const emailNormalized = normalizeEmail(email);
    const hash = await passwordHash(parsed.data.password);

    try {
      const account = await withAuthTransaction(async (client) => {
        const player = await ensurePlayerAccount(client, auth.persistentId);
        if (player.email_normalized && player.email_normalized !== emailNormalized) {
          throw new Error("account_already_has_email");
        }
        if (player.password_hash) throw new Error("password_already_set");

        const other = await client.query<{ id: string }>(
          "SELECT id FROM auth_accounts WHERE email_normalized = $1 AND id <> $2 FOR UPDATE",
          [emailNormalized, player.id],
        );
        if (other.rows[0]) throw new Error("email_already_registered");

        await client.query(
          "UPDATE auth_accounts SET email = COALESCE(email, $2), email_normalized = COALESCE(email_normalized, $3), password_hash = $4, updated_at = now() WHERE id = $1",
          [player.id, email, emailNormalized, hash],
        );
        await audit(client, "password_registered", player.id, req);
        return player;
      });

      await sendSession(res, account.id, account.persistent_id, req);
    } catch (error) {
      const code = error instanceof Error ? error.message : "registration_failed";
      const status = code === "email_already_registered" ? 409 : 400;
      res.status(status).json({ error: code });
    }
  });

  app.post("/auth/login/password", authLimiter, async (req, res) => {
    if (!requireAllowedOrigin(req, res)) return;
    const parsed = PASSWORD_INPUT.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_credentials" });
      return;
    }

    const emailNormalized = normalizeEmail(parsed.data.email);
    try {
      const found = await getAuthPool().query<{
        id: string;
        status: string;
        password_hash: string | null;
      }>(
        "SELECT id, status, password_hash FROM auth_accounts WHERE email_normalized = $1",
        [emailNormalized],
      );
      const account = found.rows[0];
      const valid = await verifyPassword(parsed.data.password, account?.password_hash ?? null);
      if (!account || !valid) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }
      if (account.status !== "active") {
        res.status(403).json({ error: "account_unavailable" });
        return;
      }

      const persistentId = await withAuthTransaction((client) =>
        persistentIdForAccount(client, account.id),
      );
      await auditLogin(account.id, req);
      await sendSession(res, account.id, persistentId, req);
    } catch (error) {
      console.error("Password login failed", error);
      res.status(503).json({ error: "login_unavailable" });
    }
  });

  app.get("/auth/login/:provider", authLimiter, async (req, res) => {
    const provider = req.params.provider;
    if (!isOAuthProvider(provider)) {
      res.status(404).json({ error: "provider_not_supported" });
      return;
    }
    if (!requireAllowedOrigin(req, res)) return;
    try {
      await beginOAuth(req, res, provider, "login", null);
    } catch (error) {
      console.error("OAuth initiation failed", error);
      res.status(503).json({ error: "oauth_unavailable" });
    }
  });

  app.get("/auth/link/:provider", authLimiter, async (req, res) => {
    const provider = req.params.provider;
    if (!isOAuthProvider(provider)) {
      res.status(404).json({ error: "provider_not_supported" });
      return;
    }
    if (!requireAllowedOrigin(req, res)) return;
    try {
      const account = await currentAccountForLink(req);
      if (!account) {
        res.status(401).json({ error: "session_required" });
        return;
      }
      await beginOAuth(req, res, provider, "link", account);
    } catch (error) {
      console.error("OAuth link initiation failed", error);
      res.status(503).json({ error: "oauth_unavailable" });
    }
  });

  app.get("/auth/callback/:provider", async (req, res) => {
    const provider = req.params.provider;
    if (!isOAuthProvider(provider)) {
      res.status(404).send("Provider not supported");
      return;
    }

    let transaction:
      | Awaited<ReturnType<typeof consumeOAuthTransaction>>
      | null = null;
    try {
      transaction = await consumeOAuthTransaction(req, provider);
      clearOAuthCookie(res);
      if (!transaction) {
        res.status(400).send("OAuth request expired or could not be verified.");
        return;
      }

      if (typeof req.query.error === "string") {
        res.redirect(
          303,
          appendResult(transaction.return_path, "auth", "cancelled"),
        );
        return;
      }
      const code = typeof req.query.code === "string" ? req.query.code : "";
      if (!code) {
        res.redirect(303, appendResult(transaction.return_path, "auth", "failed"));
        return;
      }

      const verifier = decryptVerifier(transaction.code_verifier_ciphertext);
      const profile =
        provider === "google"
          ? await exchangeGoogleCode(code, verifier, transaction.nonce_hash)
          : await exchangeDiscordCode(code, verifier);

      const result = await attachOAuthIdentity(
        {
          purpose: transaction.purpose,
          account_id: transaction.account_id,
          persistent_id: transaction.persistent_id,
        },
        profile,
        req,
      );

      await sendSession(res, result.accountId, result.persistentId, req);
      res.redirect(
        303,
        appendResult(
          transaction.return_path,
          "auth",
          transaction.purpose === "link" ? "linked" : "success",
        ),
      );
    } catch (error) {
      console.error("OAuth callback failed", {
        provider,
        reason: error instanceof Error ? error.message : "unknown",
      });
      clearOAuthCookie(res);
      if (transaction) {
        const code = error instanceof Error ? error.message : "";
        const result =
          code === "email_already_registered"
            ? "email_conflict"
            : code === "identity_already_linked" || code === "provider_already_linked"
              ? "identity_conflict"
              : "failed";
        res.redirect(303, appendResult(transaction.return_path, "auth", result));
        return;
      }
      res.status(400).send("OAuth sign-in could not be completed.");
    }
  });

  app.get("/users/@me", async (req, res) => {
    try {
      await respondWithUserMe(req, res);
    } catch (error) {
      console.error("Profile request failed", error);
      res.status(503).json({ error: "profile_unavailable" });
    }
  });
}

async function auditLogin(accountId: string, req: Request): Promise<void> {
  await withAuthTransaction((client) =>
    audit(client, "password_login", accountId, req),
  );
}

/**
 * Adds the independent account-auth API used by the self-hosted deployment.
 * Existing JWT issuer, audience and Ed25519 signing keys are retained so the
 * game WebSocket and gameplay API continue to accept the new sessions.
 */
export function registerSelfHostedApi(app: Express): void {
  if (!ServerEnv.selfHostedAuthEnabled()) return;

  app.get("/.well-known/jwks.json", async (_req, res) => {
    try {
      const key = await ServerEnv.jwkPublicKey();
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json({
        keys: [
          {
            ...key,
            alg: "EdDSA",
            use: "sig",
            kid: ServerEnv.jwtKeyId(),
          },
        ],
      });
    } catch {
      res.status(503).json({ error: "signing_key_unavailable" });
    }
  });

  if (ServerEnv.accountAuthEnabled()) {
    registerAccountAuthRoutes(app);
  } else {
    registerLegacyGuestRoutes(app);
  }

  app.get("/cluster.json", (_req, res) => {
    res.status(404).json({ error: "single_server_deployment" });
  });
}
