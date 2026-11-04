const encoder = new TextEncoder();
const ACCESS_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_BYTES = 32;
const DUMMY_SALT = new Uint8Array(16).fill(0x5a);
const DUMMY_HASH = new Uint8Array(32).fill(0x3c);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "pragma": "no-cache",
      "x-content-type-options": "nosniff",
    },
  });
}

export function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256Hex(value) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(String(left ?? ""));
  const b = encoder.encode(String(right ?? ""));
  let mismatch = a.length ^ b.length;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return mismatch === 0;
}

async function derivePassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    PASSWORD_BYTES * 8,
  );
  return new Uint8Array(bits);
}

async function makePasswordRecord(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return {
    salt: toBase64(salt),
    hash: toBase64(hash),
    iterations: PASSWORD_ITERATIONS,
  };
}

async function rateLimitKey(scope, value, ip) {
  return sha256Hex(`${scope}:${value}:${ip}`);
}

async function incrementRateLimit(env, keyHash) {
  const now = Date.now();
  const row = await env.DB.prepare(
    "INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts, updated_at) VALUES (?, ?, 1, ?) " +
      "ON CONFLICT(key_hash) DO UPDATE SET " +
      "attempts = CASE WHEN excluded.updated_at - auth_rate_limits.window_started_at >= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END, " +
      "window_started_at = CASE WHEN excluded.updated_at - auth_rate_limits.window_started_at >= ? THEN excluded.updated_at ELSE auth_rate_limits.window_started_at END, " +
      "updated_at = excluded.updated_at RETURNING attempts, window_started_at",
  ).bind(keyHash, now, now, ACCESS_WINDOW_MS, ACCESS_WINDOW_MS).first();
  return Number(row?.attempts ?? MAX_ATTEMPTS + 1);
}

async function recordAttempt(env, scope, email, ip) {
  const keys = [
    await rateLimitKey(scope, email, ip),
    await rateLimitKey(scope, "ip", ip),
  ];
  const counts = await Promise.all(keys.map((key) => incrementRateLimit(env, key)));
  return { emailKey: keys[0], ipKey: keys[1], allowed: counts.every((count) => count <= MAX_ATTEMPTS) };
}

async function clearAttempts(env, keyHash) {
  await env.DB.prepare("DELETE FROM auth_rate_limits WHERE key_hash = ?").bind(keyHash).run();
}

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function authorized(request, env) {
  const header = request.headers.get("authorization") ?? "";
  return Boolean(env.INTERNAL_AUTH_SECRET) && constantTimeEqual(
    header,
    `Bearer ${env.INTERNAL_AUTH_SECRET}`,
  );
}

async function register(request, env) {
  const body = await parseJson(request);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  const persistentId = body?.persistentId;
  const ip = typeof body?.ip === "string" && body.ip.length <= 128 ? body.ip : "unknown";

  if (!email || typeof password !== "string" || password.length < 12 || password.length > 128 || !isUuid(persistentId)) {
    return json({ error: "invalid_registration" }, 400);
  }

  const limit = await recordAttempt(env, "register", email, ip);
  if (!limit.allowed) return json({ error: "rate_limited" }, 429);

  const existing = await env.DB.prepare(
    "SELECT account_id FROM auth_accounts WHERE email = ?",
  ).bind(email).first();
  if (existing) return json({ error: "email_in_use" }, 409);

  const passwordRecord = await makePasswordRecord(password);
  const accountId = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO auth_accounts (account_id, email, persistent_id, password_salt, password_hash, password_iterations, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      accountId,
      email,
      persistentId,
      passwordRecord.salt,
      passwordRecord.hash,
      passwordRecord.iterations,
      0,
      new Date().toISOString(),
    ).run();
  } catch (error) {
    // The unique constraint is the final protection against concurrent claims.
    if (/unique|constraint/i.test(String(error))) {
      return json({ error: "email_in_use" }, 409);
    }
    throw error;
  }

  await clearAttempts(env, limit.emailKey);
  return json({ email, persistentId, emailVerified: false }, 201);
}

async function login(request, env) {
  const body = await parseJson(request);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  const ip = typeof body?.ip === "string" && body.ip.length <= 128 ? body.ip : "unknown";

  if (!email || typeof password !== "string" || password.length < 1 || password.length > 128) {
    return json({ error: "invalid_credentials" }, 401);
  }

  const limit = await recordAttempt(env, "login", email, ip);
  if (!limit.allowed) return json({ error: "rate_limited" }, 429);

  const account = await env.DB.prepare(
    "SELECT account_id, email, persistent_id, password_salt, password_hash, password_iterations, email_verified FROM auth_accounts WHERE email = ?",
  ).bind(email).first();

  // Perform the same expensive derivation for unknown email addresses to reduce
  // account-enumeration timing differences.
  const salt = account ? fromBase64(account.password_salt) : DUMMY_SALT;
  const iterations = account ? account.password_iterations : PASSWORD_ITERATIONS;
  const actual = await derivePassword(password, salt, iterations);
  const expected = account ? fromBase64(account.password_hash) : DUMMY_HASH;
  const valid = constantTimeEqual(toBase64(actual), toBase64(expected)) && Boolean(account);

  if (!valid) return json({ error: "invalid_credentials" }, 401);

  await clearAttempts(env, limit.emailKey);
  return json({
    email: account.email,
    persistentId: account.persistent_id,
    emailVerified: account.email_verified === 1,
  });
}

async function identity(request, env) {
  const url = new URL(request.url);
  const persistentId = url.searchParams.get("persistentId");
  if (!isUuid(persistentId)) return json({ error: "invalid_persistent_id" }, 400);

  const account = await env.DB.prepare(
    "SELECT email, email_verified FROM auth_accounts WHERE persistent_id = ?",
  ).bind(persistentId).first();
  if (!account) return json({ error: "account_not_found" }, 404);
  return json({ email: account.email, emailVerified: account.email_verified === 1 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      const db = await env.DB.prepare("SELECT 1 AS ok").first();
      if (db?.ok !== 1) return json({ status: "database_unavailable" }, 503);
      return json({ status: "ok", database: "connected" });
    }
    if (!url.pathname.startsWith("/internal/")) return json({ error: "not_found" }, 404);
    if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);

    try {
      if (url.pathname === "/internal/register" && request.method === "POST") {
        return await register(request, env);
      }
      if (url.pathname === "/internal/login" && request.method === "POST") {
        return await login(request, env);
      }
      if (url.pathname === "/internal/identity" && request.method === "GET") {
        return await identity(request, env);
      }
      if (url.pathname === "/internal/health" && request.method === "GET") {
        return json({ status: "ok" });
      }
      return json({ error: "not_found" }, 404);
    } catch (error) {
      // Keep database and cryptographic details out of public responses.
      console.error("Open War auth Worker error", error instanceof Error ? error.message : "unknown");
      return json({ error: "auth_service_unavailable" }, 503);
    }
  },
};
