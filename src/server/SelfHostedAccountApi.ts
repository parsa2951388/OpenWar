import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
} from "jose";
import { z } from "zod";
import { uuidToBase64url } from "@openfront/shared/Base64";
import { authDatabaseConfigured, authPool, authTransaction, ensureAuthDatabase } from "./AuthDatabase";
import { verifyClientToken } from "./jwt";
import { ServerEnv } from "./ServerEnv";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_COOKIE = "__Host-openwar_refresh";
const OAUTH_COOKIE = "__Host-openwar_oauth";
const PASSWORD_COST = { N: 32_768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

const RegisterInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});
const PasswordLoginInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});
const ResetRequestInput = z.object({
  email: z.string().trim().email().max(254),
});
const ResetPasswordInput = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128),
});
const EmailResendInput = z.object({
  email: z.string().trim().email().max(254),
});
const OAuthStartInput = z.object({
  returnPath: z.string().max(2048).optional(),
});

type Provider = "google" | "discord";
type AccountProvider = "email" | Provider;

let signingKey: ReturnType<typeof importPKCS8> | null = null;

function privateSigningKey() {
  if (signingKey === null) {
    const pem = ServerEnv.jwtPrivateKey();
    if (!pem) throw new Error("JWT_PRIVATE_KEY is required for account auth");
    signingKey = importPKCS8(pem, "EdDSA");
  }
  return signingKey;
}

function sha256(value: string | Buffer): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeEmail(email: string): string {
  return email.normalize("NFC").trim().toLowerCase();
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
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
  res.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${encodeURIComponent(token)}; Max-Age=${REFRESH_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}

function clearRefreshCookie(res: Response): void {
  res.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}

function setOAuthCookie(res: Response, value: string): void {
  res.append(
    "Set-Cookie",
    `${OAUTH_COOKIE}=${encodeURIComponent(value)}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}

function clearOAuthCookie(res: Response): void {
  res.append(
    "Set-Cookie",
    `${OAUTH_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}

function bearerToken(req: Request): string | null {
  const value = req.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

function originAllowed(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin) return false;
  const allowed = new Set([
    ServerEnv.authOrigin(),
    ...(process.env.AUTH_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim().replace(/\/$/, ""))
      .filter(Boolean),
  ]);
  if (ServerEnv.jwtAudience() === "localhost") {
    allowed.add("http://localhost:5173");
    allowed.add("http://localhost:4173");
    allowed.add("http://localhost:9000");
  }
  return allowed.has(origin);
}

function requireOrigin(req: Request, res: Response): boolean {
  if (originAllowed(req)) return true;
  res.status(403).json({ error: "origin_not_allowed" });
  return false;
}

async function requireGuestIdentity(req: Request): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const auth = await verifyClientToken(token);
  if (auth.type !== "success") return null;
  const provider = auth.claims?.provider;
  if (provider !== undefined && provider !== "guest") return null;
  return auth.persistentId;
}

async function requireAnyAccountIdentity(req: Request): Promise<{
  persistentId: string;
  accountId: string | null;
} | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const auth = await verifyClientToken(token);
  if (auth.type !== "success") return null;
  const provider = auth.claims?.provider;
  if (provider === undefined || provider === "guest") {
    return { persistentId: auth.persistentId, accountId: null };
  }
  if (!authDatabaseConfigured()) return null;
  const result = await authPool().query(
    `SELECT account_id FROM auth_account_players WHERE persistent_id = $1`,
    [auth.persistentId],
  );
  return {
    persistentId: auth.persistentId,
    accountId: result.rows[0]?.account_id ?? null,
  };
}

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, 64, PASSWORD_COST, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt);
  return [
    "scrypt",
    PASSWORD_COST.N,
    PASSWORD_COST.r,
    PASSWORD_COST.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
  const parts = stored?.split("$") ?? [];
  if (
    parts.length !== 6 ||
    parts[0] !== "scrypt" ||
    Number(parts[1]) !== PASSWORD_COST.N ||
    Number(parts[2]) !== PASSWORD_COST.r ||
    Number(parts[3]) !== PASSWORD_COST.p
  ) {
    // Keep the no-account path expensive too, without accepting its result.
    await scrypt(password, Buffer.alloc(16, 0x5a));
    return false;
  }
  try {
    const expected = Buffer.from(parts[5], "base64url");
    const actual = await scrypt(password, Buffer.from(parts[4], "base64url"));
    return safeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function signAccountAccessToken(
  persistentId: string,
  provider: AccountProvider,
): Promise<string> {
  return new SignJWT({ provider, token_use: "access" })
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
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(await privateSigningKey());
}

async function createAccountSession(
  accountId: string,
  persistentId: string,
  provider: AccountProvider,
  userAgent: string,
): Promise<{ jwt: string; refreshToken: string }> {
  const refreshToken = randomToken(48);
  const tokenHash = sha256(refreshToken);
  const sessionId = randomUUID();
  const familyId = randomUUID();

  await authTransaction(async (client) => {
    await client.query(
      `INSERT INTO auth_sessions
        (id, account_id, token_family_id, refresh_token_hash, token_generation,
         expires_at, user_agent)
       VALUES ($1, $2, $3, $4, 0, now() + interval '30 days', $5)`,
      [sessionId, accountId, familyId, tokenHash, userAgent.slice(0, 512)],
    );
    await client.query(
      `INSERT INTO auth_refresh_token_history
        (id, session_id, token_hash, token_generation)
       VALUES ($1, $2, $3, 0)`,
      [randomUUID(), sessionId, tokenHash],
    );
    await client.query(
      "UPDATE auth_accounts SET last_authenticated_at = now(), updated_at = now() WHERE id = $1",
      [accountId],
    );
  });

  return {
    refreshToken,
    jwt: await signAccountAccessToken(persistentId, provider),
  };
}

async function sendAccountSession(
  res: Response,
  accountId: string,
  persistentId: string,
  provider: AccountProvider,
  userAgent: string,
): Promise<void> {
  const session = await createAccountSession(
    accountId,
    persistentId,
    provider,
    userAgent,
  );
  setRefreshCookie(res, session.refreshToken);
  res.setHeader("Cache-Control", "no-store");
  res.json({ jwt: session.jwt, expiresIn: ACCESS_TTL_SECONDS });
}

async function sendResendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  if (!ServerEnv.emailApiKey() || !ServerEnv.emailFrom()) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ServerEnv.emailApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ServerEnv.emailFrom(),
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch (error) {
    console.warn("Open War email delivery failed:", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}

async function createEmailChallenge(
  accountId: string,
  purpose: "verify_email" | "reset_password",
  targetEmail: string | null,
): Promise<string> {
  const token = randomToken(32);
  await authPool().query(
    `INSERT INTO auth_email_challenges
      (id, account_id, purpose, token_hash, target_email, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + interval '30 minutes')`,
    [
      randomUUID(),
      accountId,
      purpose,
      sha256(token),
      targetEmail,
    ],
  );
  return token;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emailLink(path: string, token: string): string {
  const url = new URL(path, ServerEnv.authOrigin());
  url.searchParams.set("token", token);
  return url.toString();
}

async function accountByPersistentId(persistentId: string) {
  const result = await authPool().query(
    `SELECT a.id AS account_id, a.email, a.email_verified_at, a.status,
            p.persistent_id
       FROM auth_account_players p
       JOIN auth_accounts a ON a.id = p.account_id
      WHERE p.persistent_id = $1`,
    [persistentId],
  );
  return result.rows[0] ?? null;
}

function oauthEncryptionKey(): Buffer {
  const raw = ServerEnv.authEncryptionKey();
  if (!/^[a-fA-F0-9]{64}$/.test(raw)) {
    throw new Error("AUTH_ENCRYPTION_KEY must be a 32-byte hex value");
  }
  return Buffer.from(raw, "hex");
}

function encryptVerifier(verifier: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", oauthEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(verifier, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

function decryptVerifier(value: Buffer): string {
  const iv = value.subarray(0, 12);
  const tag = value.subarray(12, 28);
  const encrypted = value.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", oauthEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

function validReturnPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/#modal=account";
  }
  try {
    const url = new URL(value, ServerEnv.authOrigin());
    if (url.origin !== ServerEnv.authOrigin()) return "/#modal=account";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/#modal=account";
  }
}

function redirectAfterOAuth(
  res: Response,
  returnPath: string,
  loginError?: "email_exists" | "error",
): void {
  clearOAuthCookie(res);
  const destination = new URL(returnPath, ServerEnv.authOrigin());
  const hash = new URLSearchParams(destination.hash.replace(/^#/, ""));
  if (!hash.has("modal")) hash.set("modal", "account");
  if (loginError) hash.set("login", loginError);
  destination.hash = hash.toString();
  res.redirect(303, destination.toString());
}

function providerConfig(provider: Provider) {
  if (provider === "google") {
    return {
      clientId: ServerEnv.googleClientId(),
      clientSecret: ServerEnv.googleClientSecret(),
      callback: `${ServerEnv.authOrigin()}/auth/callback/google`,
    };
  }
  return {
    clientId: ServerEnv.discordClientId(),
    clientSecret: ServerEnv.discordClientSecret(),
    callback: `${ServerEnv.authOrigin()}/auth/callback/discord`,
  };
}

function providerReady(provider: Provider): boolean {
  const config = providerConfig(provider);
  return Boolean(config.clientId && config.clientSecret);
}

async function startOAuth(
  req: Request,
  res: Response,
  provider: Provider,
): Promise<void> {
  if (!requireOrigin(req, res)) return;
  if (!authDatabaseConfigured()) {
    res.status(503).json({ error: "account_auth_not_configured" });
    return;
  }
  if (!providerReady(provider)) {
    res.status(503).json({ error: "oauth_provider_not_configured" });
    return;
  }

  const parsed = OAuthStartInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_oauth_request" });
    return;
  }

  await ensureAuthDatabase();
  const identity = await requireAnyAccountIdentity(req);
  if (!identity) {
    res.status(401).json({ error: "valid_session_required" });
    return;
  }

  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const challenge = sha256(verifier).toString("base64url");
  const browserBinding = randomToken();
  const stateHash = sha256(state);
  const nonceHash = sha256(nonce);
  const browserHash = sha256(browserBinding);
  const config = providerConfig(provider);
  const accountId = identity.accountId;
  const purpose = accountId ? "link" : "login";
  const returnPath = validReturnPath(parsed.data.returnPath);

  await ensureAuthDatabase();
  await authPool().query(
    `INSERT INTO auth_oauth_transactions
      (id, provider, purpose, account_id, persistent_id, state_hash, nonce_hash,
       browser_binding_hash, code_verifier_ciphertext, return_path, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now() + interval '10 minutes')`,
    [
      randomUUID(),
      provider,
      purpose,
      accountId,
      identity.persistentId,
      stateHash,
      nonceHash,
      browserHash,
      encryptVerifier(verifier),
      returnPath,
    ],
  );

  const endpoint =
    provider === "google"
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : "https://discord.com/oauth2/authorize";
  const url = new URL(endpoint);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.callback);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (provider === "google") {
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("access_type", "online");
  } else {
    url.searchParams.set("scope", "identify email");
  }

  setOAuthCookie(res, browserBinding);
  res.setHeader("Cache-Control", "no-store");
  res.json({ url: url.toString() });
}

async function consumeOAuthTransaction(
  req: Request,
  provider: Provider,
  state: string,
): Promise<Record<string, unknown> | null> {
  const binding = cookieValue(req, OAUTH_COOKIE);
  if (!binding) return null;
  const stateHash = sha256(state);
  const bindingHash = sha256(binding);

  return authTransaction(async (client) => {
    const result = await client.query(
      `SELECT *
         FROM auth_oauth_transactions
        WHERE provider = $1 AND state_hash = $2
          AND expires_at > now() AND consumed_at IS NULL
        FOR UPDATE`,
      [provider, stateHash],
    );
    const tx = result.rows[0] as Record<string, unknown> | undefined;
    if (!tx || !(tx.browser_binding_hash instanceof Buffer)) return null;
    if (!safeEqual(tx.browser_binding_hash, bindingHash)) return null;
    await client.query(
      "UPDATE auth_oauth_transactions SET consumed_at = now() WHERE id = $1",
      [tx.id],
    );
    return tx;
  });
}

async function exchangeGoogle(
  code: string,
  verifier: string,
  nonceHash: Buffer,
): Promise<{
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  profile: Record<string, unknown>;
}> {
  const config = providerConfig("google");
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: config.callback,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Google token exchange failed");
  const tokenResponse = (await response.json()) as { id_token?: string };
  if (typeof tokenResponse.id_token !== "string") {
    throw new Error("Google returned no ID token");
  }
  const { payload } = await jwtVerify(
    tokenResponse.id_token,
    GOOGLE_JWKS,
    {
      algorithms: ["RS256"],
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: config.clientId,
    },
  );
  if (
    typeof payload.sub !== "string" ||
    typeof payload.nonce !== "string" ||
    !safeEqual(sha256(payload.nonce), nonceHash) ||
    typeof payload.email !== "string" ||
    payload.email_verified !== true
  ) {
    throw new Error("Google identity verification failed");
  }
  return {
    subject: payload.sub,
    email: payload.email,
    emailVerified: true,
    displayName: typeof payload.name === "string" ? payload.name : null,
    avatarUrl: typeof payload.picture === "string" ? payload.picture : null,
    profile: {
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : null,
      picture: typeof payload.picture === "string" ? payload.picture : null,
    },
  };
}

async function exchangeDiscord(
  code: string,
  verifier: string,
): Promise<{
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  profile: Record<string, unknown>;
}> {
  const config = providerConfig("discord");
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: config.callback,
  });
  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) throw new Error("Discord token exchange failed");
  const token = (await tokenResponse.json()) as { access_token?: string; token_type?: string };
  if (typeof token.access_token !== "string") {
    throw new Error("Discord returned no access token");
  }

  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!userResponse.ok) throw new Error("Discord profile request failed");
  const user = (await userResponse.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
    discriminator?: string;
    avatar?: string | null;
    email?: string | null;
    verified?: boolean;
  };
  if (typeof user.id !== "string" || typeof user.username !== "string") {
    throw new Error("Discord identity is invalid");
  }
  const avatarUrl =
    user.avatar === null || user.avatar === undefined
      ? null
      : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  return {
    subject: user.id,
    email: user.verified === true && typeof user.email === "string" ? user.email : null,
    emailVerified: user.verified === true,
    displayName: user.global_name ?? user.username,
    avatarUrl,
    profile: {
      id: user.id,
      avatar: user.avatar ?? null,
      username: user.username,
      global_name: user.global_name ?? null,
      discriminator: user.discriminator ?? "0",
    },
  };
}

async function completeOAuth(
  req: Request,
  res: Response,
  provider: Provider,
): Promise<void> {
  const returnFallback = "/#modal=account";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const tx = state
    ? await consumeOAuthTransaction(req, provider, state)
    : null;
  if (!tx || typeof tx.return_path !== "string") {
    redirectAfterOAuth(res, returnFallback, "error");
    return;
  }
  const returnPath = tx.return_path;
  clearOAuthCookie(res);

  if (typeof req.query.error === "string" || !code) {
    redirectAfterOAuth(res, returnPath);
    return;
  }

  try {
    if (
      !(tx.code_verifier_ciphertext instanceof Buffer) ||
      !(tx.nonce_hash instanceof Buffer) ||
      typeof tx.persistent_id !== "string"
    ) {
      throw new Error("OAuth transaction is incomplete");
    }
    const verifier = decryptVerifier(tx.code_verifier_ciphertext);
    const identity =
      provider === "google"
        ? await exchangeGoogle(code, verifier, tx.nonce_hash)
        : await exchangeDiscord(code, verifier);

    const account = await authTransaction(async (client) => {
      const found = await client.query(
        `SELECT i.account_id, p.persistent_id
           FROM auth_account_identities i
           JOIN auth_account_players p ON p.account_id = i.account_id
          WHERE i.provider = $1 AND i.provider_subject = $2
          FOR UPDATE OF i`,
        [provider, identity.subject],
      );

      let accountId: string;
      let persistentId: string;
      const requestedAccountId =
        typeof tx.account_id === "string" ? tx.account_id : null;

      if (found.rowCount) {
        accountId = found.rows[0].account_id as string;
        persistentId = found.rows[0].persistent_id as string;
        if (requestedAccountId && requestedAccountId !== accountId) {
          throw new Error("identity_already_linked");
        }
      } else if (requestedAccountId) {
        accountId = requestedAccountId;
        const player = await client.query(
          "SELECT persistent_id FROM auth_account_players WHERE account_id = $1 FOR UPDATE",
          [accountId],
        );
        if (!player.rowCount) throw new Error("account_player_mapping_missing");
        persistentId = player.rows[0].persistent_id as string;
        const alreadyLinked = await client.query(
          "SELECT 1 FROM auth_account_identities WHERE account_id = $1 AND provider = $2",
          [accountId, provider],
        );
        if (alreadyLinked.rowCount) throw new Error("provider_already_linked");
      } else {
        persistentId = tx.persistent_id as string;
        const email = identity.emailVerified ? identity.email : null;
        const emailNormalized = email ? normalizeEmail(email) : null;

        if (emailNormalized) {
          const emailOwner = await client.query(
            "SELECT id FROM auth_accounts WHERE email_normalized = $1",
            [emailNormalized],
          );
          if (emailOwner.rowCount) throw new Error("email_exists");
        }

        accountId = randomUUID();
        await client.query(
          `INSERT INTO auth_accounts
            (id, email, email_normalized, email_verified_at)
           VALUES ($1, $2, $3, CASE WHEN $2::text IS NULL THEN NULL ELSE now() END)`,
          [accountId, email, emailNormalized],
        );
        await client.query(
          "INSERT INTO auth_account_players (account_id, persistent_id) VALUES ($1, $2)",
          [accountId, persistentId],
        );
      }

      if (!found.rowCount) {
        const email = identity.emailVerified ? identity.email : null;
        const emailNormalized = email ? normalizeEmail(email) : null;
        if (requestedAccountId && emailNormalized) {
          const owner = await client.query(
            "SELECT id FROM auth_accounts WHERE email_normalized = $1 AND id <> $2",
            [emailNormalized, requestedAccountId],
          );
          if (owner.rowCount) throw new Error("email_exists");
          await client.query(
            `UPDATE auth_accounts
                SET email = COALESCE(email, $1),
                    email_normalized = COALESCE(email_normalized, $2),
                    email_verified_at = CASE WHEN $2::text IS NULL THEN email_verified_at ELSE now() END,
                    updated_at = now()
              WHERE id = $3`,
            [email, emailNormalized, accountId],
          );
        }
        await client.query(
          `INSERT INTO auth_account_identities
            (id, account_id, provider, provider_subject, provider_email,
             provider_email_verified, display_name, avatar_url, provider_profile)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
          [
            randomUUID(),
            accountId,
            provider,
            identity.subject,
            identity.email,
            identity.emailVerified,
            identity.displayName,
            identity.avatarUrl,
            JSON.stringify(identity.profile),
          ],
        );
      }

      return { accountId, persistentId };
    });

    const session = await createAccountSession(
      account.accountId,
      account.persistentId,
      provider,
      req.get("user-agent") ?? "",
    );
    setRefreshCookie(res, session.refreshToken);
    res.setHeader("Cache-Control", "no-store");
    // The browser reloads, then exchanges the HttpOnly refresh cookie for
    // an access JWT without exposing any credential in the redirect URL.
    redirectAfterOAuth(res, returnPath);
  } catch (error) {
    const code =
      error instanceof Error && error.message === "email_exists"
        ? "email_exists"
        : "error";
    if (!res.headersSent) redirectAfterOAuth(res, returnPath, code);
  }
}

async function registerEmailAccount(
  req: Request,
  res: Response,
): Promise<void> {
  if (!requireOrigin(req, res)) return;
  if (!authDatabaseConfigured()) {
    res.status(503).json({ error: "account_auth_not_configured" });
    return;
  }
  if (!ServerEnv.emailApiKey() || !ServerEnv.emailFrom()) {
    res.status(503).json({ error: "email_delivery_not_configured" });
    return;
  }
  const parsed = RegisterInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_registration" });
    return;
  }
  const persistentId = await requireGuestIdentity(req);
  if (!persistentId) {
    res.status(401).json({ error: "guest_session_required" });
    return;
  }

  const email = parsed.data.email.trim();
  const emailNormalized = normalizeEmail(email);
  const passwordHash = await hashPassword(parsed.data.password);
  const accountId = randomUUID();

  try {
    await authTransaction(async (client) => {
      const existingEmail = await client.query(
        "SELECT 1 FROM auth_accounts WHERE email_normalized = $1",
        [emailNormalized],
      );
      if (existingEmail.rowCount) throw new Error("email_exists");
      const existingPlayer = await client.query(
        "SELECT account_id FROM auth_account_players WHERE persistent_id = $1",
        [persistentId],
      );
      if (existingPlayer.rowCount) throw new Error("player_already_linked");

      await client.query(
        `INSERT INTO auth_accounts (id, email, email_normalized, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [accountId, email, emailNormalized, passwordHash],
      );
      await client.query(
        "INSERT INTO auth_account_players (account_id, persistent_id) VALUES ($1, $2)",
        [accountId, persistentId],
      );
    });

    const token = await createEmailChallenge(
      accountId,
      "verify_email",
      email,
    );
    const verifyUrl = emailLink("/auth/email/verify", token);
    const sent = await sendResendEmail({
      to: email,
      subject: "Verify your Open War account",
      html: `<p>Welcome to Open War.</p><p>Verify your email address to activate your account:</p><p><a href="${verifyUrl}">Verify email</a></p><p>This link expires in 30 minutes. If you did not create this account, you can ignore this email.</p>`,
      text: `Welcome to Open War. Verify your email: ${verifyUrl}\nThis link expires in 30 minutes.`,
    });
    if (!sent) {
      res.status(503).json({ error: "verification_email_delivery_failed" });
      return;
    }
    res.status(202).setHeader("Cache-Control", "no-store").json({
      status: "verification_required",
    });
  } catch (error) {
    res.status(error instanceof Error && error.message === "email_exists" ? 409 : 400)
      .json({ error: authErrorCode(error) });
  }
}

async function passwordLogin(
  req: Request,
  res: Response,
): Promise<void> {
  if (!requireOrigin(req, res)) return;
  if (!authDatabaseConfigured()) {
    res.status(503).json({ error: "account_auth_not_configured" });
    return;
  }
  const parsed = PasswordLoginInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_credentials" });
    return;
  }
  await ensureAuthDatabase();
  const emailNormalized = normalizeEmail(parsed.data.email);
  const result = await authPool().query(
    `SELECT a.id AS account_id, a.password_hash, a.status,
            p.persistent_id
       FROM auth_accounts a
       JOIN auth_account_players p ON p.account_id = a.id
      WHERE a.email_normalized = $1`,
    [emailNormalized],
  );
  const account = result.rows[0] as
    | { account_id: string; password_hash: string | null; status: string; persistent_id: string }
    | undefined;
  const passwordValid = await verifyPassword(
    account?.password_hash ?? null,
    parsed.data.password,
  );
  if (!account || !passwordValid || account.status !== "active") {
    res.status(401).json({ error: "invalid_credentials" });
    return;
  }

  const verified = await authPool().query(
    "SELECT email_verified_at FROM auth_accounts WHERE id = $1",
    [account.account_id],
  );
  if (!verified.rows[0]?.email_verified_at) {
    res.status(403).json({ error: "email_not_verified" });
    return;
  }
  await sendAccountSession(
    res,
    account.account_id,
    account.persistent_id,
    "email",
    req.get("user-agent") ?? "",
  );
}

async function requestPasswordReset(
  req: Request,
  res: Response,
): Promise<void> {
  if (!requireOrigin(req, res)) return;
  if (!authDatabaseConfigured()) {
    res.status(503).json({ error: "account_auth_not_configured" });
    return;
  }
  if (!ServerEnv.emailApiKey() || !ServerEnv.emailFrom()) {
    res.status(503).json({ error: "email_delivery_not_configured" });
    return;
  }
  const parsed = ResetRequestInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(202).json({ status: "accepted" });
    return;
  }
  await ensureAuthDatabase();
  const emailNormalized = normalizeEmail(parsed.data.email);
  const result = await authPool().query(
    "SELECT id, email FROM auth_accounts WHERE email_normalized = $1 AND status = 'active' AND password_hash IS NOT NULL",
    [emailNormalized],
  );
  const account = result.rows[0] as { id: string; email: string } | undefined;
  if (account) {
    const token = await createEmailChallenge(account.id, "reset_password", account.email);
    const resetUrl = emailLink("/auth/password/reset", token);
    const sent = await sendResendEmail({
      to: account.email,
      subject: "Reset your Open War password",
      html: `<p>A password reset was requested for your Open War account.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>`,
      text: `Reset your Open War password: ${resetUrl}\nThis link expires in 30 minutes.`,
    });
    if (!sent) {
      console.warn("Password reset email was not accepted by the email provider.");
    }
  }
  // Same answer for existing and unknown addresses to reduce account enumeration.
  res.status(202).setHeader("Cache-Control", "no-store").json({ status: "accepted" });
}

async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  if (!requireOrigin(req, res)) return;
  if (!authDatabaseConfigured()) {
    res.status(503).json({ error: "account_auth_not_configured" });
    return;
  }
  const parsed = ResetPasswordInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_or_expired_token" });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const tokenHash = sha256(parsed.data.token);
  const result = await authTransaction(async (client) => {
    const challenge = await client.query(
      `SELECT id, account_id
         FROM auth_email_challenges
        WHERE token_hash = $1 AND purpose = 'reset_password'
          AND consumed_at IS NULL AND expires_at > now()
        FOR UPDATE`,
      [tokenHash],
    );
    if (!challenge.rowCount) return false;
    const accountId = challenge.rows[0].account_id as string;
    await client.query(
      "UPDATE auth_email_challenges SET consumed_at = now() WHERE id = $1",
      [challenge.rows[0].id],
    );
    await client.query(
      "UPDATE auth_accounts SET password_hash = $1, updated_at = now() WHERE id = $2",
      [passwordHash, accountId],
    );
    await client.query(
      `UPDATE auth_sessions
          SET revoked_at = now(), revoke_reason = 'password_reset'
        WHERE account_id = $1 AND revoked_at IS NULL`,
      [accountId],
    );
    return true;
  });
  if (!result) {
    res.status(400).json({ error: "invalid_or_expired_token" });
    return;
  }
  clearRefreshCookie(res);
  res.setHeader("Cache-Control", "no-store");
  res.json({ status: "password_reset" });
}

async function verifyEmail(
  req: Request,
  res: Response,
): Promise<void> {
  if (!authDatabaseConfigured()) {
    res.status(503).send("Account verification is not configured.");
    return;
  }
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).send("Verification link is invalid or expired.");
    return;
  }
  const verified = await authTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, account_id, target_email
         FROM auth_email_challenges
        WHERE token_hash = $1 AND purpose = 'verify_email'
          AND consumed_at IS NULL AND expires_at > now()
        FOR UPDATE`,
      [sha256(token)],
    );
    if (!result.rowCount) return false;
    const challenge = result.rows[0] as {
      id: string;
      account_id: string;
      target_email: string;
    };
    await client.query(
      "UPDATE auth_email_challenges SET consumed_at = now() WHERE id = $1",
      [challenge.id],
    );
    await client.query(
      `UPDATE auth_accounts
          SET email_verified_at = now(), updated_at = now()
        WHERE id = $1 AND email_normalized = $2`,
      [challenge.account_id, normalizeEmail(challenge.target_email)],
    );
    return true;
  });
  if (!verified) {
    res.status(400).send("Verification link is invalid or expired.");
    return;
  }
  res.redirect(303, `${ServerEnv.authOrigin()}/#modal=account&verified=1`);
}

async function rotateAccountRefreshToken(
  res: Response,
  token: string,
): Promise<boolean> {
  if (!authDatabaseConfigured()) return false;
  const oldHash = sha256(token);
  const nextToken = randomToken(48);
  const nextHash = sha256(nextToken);

  const outcome = await authTransaction(async (client) => {
    const result = await client.query(
      `SELECT h.id AS history_id, h.session_id, h.token_generation, h.used_at,
              s.account_id, s.token_family_id, s.expires_at, s.revoked_at,
              p.persistent_id,
              CASE WHEN a.password_hash IS NOT NULL THEN 'email'
                   ELSE COALESCE((SELECT i.provider
                                    FROM auth_account_identities i
                                   WHERE i.account_id = a.id
                                   ORDER BY i.created_at
                                   LIMIT 1), 'email') END AS provider
         FROM auth_refresh_token_history h
         JOIN auth_sessions s ON s.id = h.session_id
         JOIN auth_accounts a ON a.id = s.account_id
         JOIN auth_account_players p ON p.account_id = a.id
        WHERE h.token_hash = $1
        FOR UPDATE OF h, s`,
      [oldHash],
    );
    if (!result.rowCount) return null;
    const session = result.rows[0] as {
      history_id: string;
      session_id: string;
      token_generation: number;
      used_at: Date | null;
      account_id: string;
      token_family_id: string;
      expires_at: Date;
      revoked_at: Date | null;
      persistent_id: string;
      provider: AccountProvider;
    };

    if (session.used_at) {
      await client.query(
        `UPDATE auth_sessions
            SET revoked_at = COALESCE(revoked_at, now()),
                revoke_reason = 'refresh_token_reuse'
          WHERE token_family_id = $1 AND revoked_at IS NULL`,
        [session.token_family_id],
      );
      return { reuse: true as const };
    }
    if (
      session.revoked_at ||
      new Date(session.expires_at).getTime() <= Date.now()
    ) {
      return null;
    }

    const nextGeneration = session.token_generation + 1;
    await client.query(
      "UPDATE auth_refresh_token_history SET used_at = now() WHERE id = $1",
      [session.history_id],
    );
    await client.query(
      `UPDATE auth_sessions
          SET refresh_token_hash = $1,
              token_generation = $2,
              last_used_at = now(),
              rotated_at = now(),
              expires_at = now() + interval '30 days'
        WHERE id = $3`,
      [nextHash, nextGeneration, session.session_id],
    );
    await client.query(
      `INSERT INTO auth_refresh_token_history
        (id, session_id, token_hash, token_generation)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), session.session_id, nextHash, nextGeneration],
    );
    return {
      reuse: false as const,
      accountId: session.account_id,
      persistentId: session.persistent_id,
      provider: session.provider,
    };
  });

  if (!outcome || outcome.reuse) {
    clearRefreshCookie(res);
    res.status(401).json({
      error: outcome?.reuse ? "refresh_token_reuse_detected" : "refresh_session_invalid",
    });
    return true;
  }

  const jwt = await signAccountAccessToken(
    outcome.persistentId,
    outcome.provider,
  );
  setRefreshCookie(res, nextToken);
  res.setHeader("Cache-Control", "no-store");
  res.json({ jwt, expiresIn: ACCESS_TTL_SECONDS });
  return true;
}

export async function revokeAccountRefreshToken(
  token: string,
  revokeAll: boolean,
): Promise<boolean> {
  if (!authDatabaseConfigured() || token.includes(".")) return false;
  const tokenHash = sha256(token);
  await ensureAuthDatabase();
  const client = await authPool().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      `SELECT s.id AS session_id, s.account_id
         FROM auth_refresh_token_history h
         JOIN auth_sessions s ON s.id = h.session_id
        WHERE h.token_hash = $1
        FOR UPDATE OF s`,
      [tokenHash],
    );
    if (!found.rowCount) {
      await client.query("COMMIT");
      return true;
    }
    const { session_id, account_id } = found.rows[0] as {
      session_id: string;
      account_id: string;
    };
    if (revokeAll) {
      await client.query(
        `UPDATE auth_sessions
            SET revoked_at = now(), revoke_reason = 'logout_all'
          WHERE account_id = $1 AND revoked_at IS NULL`,
        [account_id],
      );
    } else {
      await client.query(
        `UPDATE auth_sessions
            SET revoked_at = now(), revoke_reason = 'logout'
          WHERE id = $1 AND revoked_at IS NULL`,
        [session_id],
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function accountUserMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = bearerToken(req);
  if (!token) return next();
  const auth = await verifyClientToken(token);
  if (auth.type !== "success") {
    res.status(401).json({ error: "invalid_session" });
    return;
  }
  const provider = auth.claims?.provider;
  if (provider === undefined || provider === "guest") return next();
  if (!authDatabaseConfigured()) {
    res.status(503).json({ error: "account_auth_not_configured" });
    return;
  }
  await ensureAuthDatabase();
  const account = await accountByPersistentId(auth.persistentId);
  if (!account || account.status !== "active") {
    res.status(401).json({ error: "account_not_found" });
    return;
  }

  const identities = await authPool().query(
    `SELECT provider, provider_email, provider_profile
       FROM auth_account_identities
      WHERE account_id = $1`,
    [account.account_id],
  );
  const user: Record<string, unknown> = {};
  if (account.email) user.email = account.email;
  for (const identity of identities.rows as Array<{
    provider: string;
    provider_email: string | null;
    provider_profile: Record<string, unknown> | null;
  }>) {
    if (identity.provider === "google" && identity.provider_email) {
      user.google = { email: identity.provider_email };
    } else if (identity.provider === "discord" && identity.provider_profile) {
      user.discord = identity.provider_profile;
    }
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({
    user,
    player: {
      publicId: auth.persistentId,
      adfree: false,
      canCreatePublicLobbies: false,
      achievements: { singleplayerMap: [], player: [] },
      friends: [],
      subscription: null,
    },
  });
}

function rateLimitOptions(max: number) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: "too_many_attempts" });
    },
  });
}

export function registerSelfHostedAccountApi(app: Express): void {
  const strictLimit = rateLimitOptions(8);
  const resetLimit = rateLimitOptions(4);
  const oauthLimit = rateLimitOptions(15);

  app.post("/auth/register", strictLimit, async (req, res) => {
    try {
      await registerEmailAccount(req, res);
    } catch (error) {
      console.error("Account registration failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) res.status(503).json({ error: "account_auth_unavailable" });
    }
  });

  app.post("/auth/login/password", strictLimit, async (req, res) => {
    try {
      await passwordLogin(req, res);
    } catch (error) {
      console.error("Password login failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) res.status(503).json({ error: "account_auth_unavailable" });
    }
  });

  app.post("/auth/password/forgot", resetLimit, async (req, res) => {
    try {
      await requestPasswordReset(req, res);
    } catch (error) {
      console.error("Password reset request failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) res.status(503).json({ error: "account_auth_unavailable" });
    }
  });

  app.post("/auth/password/reset", strictLimit, async (req, res) => {
    try {
      await resetPassword(req, res);
    } catch (error) {
      console.error("Password reset failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) res.status(503).json({ error: "account_auth_unavailable" });
    }
  });

  app.get("/auth/email/verify", async (req, res) => {
    try {
      await verifyEmail(req, res);
    } catch (error) {
      console.error("Email verification failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) res.status(503).send("Email verification is temporarily unavailable.");
    }
  });

  app.get("/auth/password/reset", (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token || token.length < 32 || token.length > 256) {
      res.status(400).send("Password reset link is invalid or expired.");
      return;
    }
    res.redirect(
      303,
      `${ServerEnv.authOrigin()}/#modal=account&resetToken=${encodeURIComponent(token)}`,
    );
  });

  app.post("/auth/oauth/:provider/start", oauthLimit, async (req, res) => {
    const provider =
      req.params.provider === "google" || req.params.provider === "discord"
        ? req.params.provider
        : null;
    if (!provider) {
      res.status(404).json({ error: "oauth_provider_not_supported" });
      return;
    }
    try {
      await startOAuth(req, res, provider);
    } catch (error) {
      console.error("OAuth start failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) res.status(503).json({ error: "oauth_unavailable" });
    }
  });

  app.get("/auth/callback/google", async (req, res) => {
    try {
      await completeOAuth(req, res, "google");
    } catch (error) {
      console.error("Google callback failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) redirectAfterOAuth(res, "/#modal=account", "error");
    }
  });

  app.get("/auth/callback/discord", async (req, res) => {
    try {
      await completeOAuth(req, res, "discord");
    } catch (error) {
      console.error("Discord callback failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) redirectAfterOAuth(res, "/#modal=account", "error");
    }
  });

  app.get("/users/@me", (req, res, next) => {
    accountUserMe(req, res, next).catch((error) => {
      console.error("Account profile lookup failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) res.status(503).json({ error: "account_auth_unavailable" });
    });
  });

  app.post("/auth/refresh", async (req, res, next) => {
    const token = cookieValue(req, REFRESH_COOKIE);
    if (!token || token.includes(".")) return next();
    try {
      const handled = await rotateAccountRefreshToken(res, token);
      if (!handled) return next();
    } catch (error) {
      console.error("Account refresh failed:", error instanceof Error ? error.message : "unknown error");
      if (!res.headersSent) res.status(503).json({ error: "account_auth_unavailable" });
    }
  });

  for (const [route, revokeAll] of [
    ["/auth/logout", false],
    ["/auth/revoke", true],
  ] as const) {
    app.post(route, async (req, res, next) => {
      const token = cookieValue(req, REFRESH_COOKIE);
      if (!token || token.includes(".")) return next();
      try {
        await revokeAccountRefreshToken(token, revokeAll);
        clearRefreshCookie(res);
        res.setHeader("Cache-Control", "no-store");
        res.status(204).end();
      } catch (error) {
        console.error("Account logout failed:", error instanceof Error ? error.message : "unknown error");
        if (!res.headersSent) res.status(503).json({ error: "account_auth_unavailable" });
      }
    });
  }
}
