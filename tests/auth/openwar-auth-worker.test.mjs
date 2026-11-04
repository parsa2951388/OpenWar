import assert from "node:assert/strict";
import { it } from "vitest";
import worker from "../../cloudflare-pages/openwar-auth-worker.mjs";

const SECRET = "test-only-secret";
const PERSISTENT_ID = "40a4f3c6-2a2e-4f65-9e55-4f57ef11ef01";

class MemoryD1 {
  accounts = [];
  limits = new Map();

  prepare(sql) {
    const db = this;
    let values = [];
    return {
      bind(...args) {
        values = args;
        return this;
      },
      async first() {
        if (sql.includes("FROM auth_accounts WHERE email = ?"))
          return db.accounts.find((x) => x.email === values[0]) ?? null;
        if (sql.includes("FROM auth_accounts WHERE persistent_id = ?"))
          return db.accounts.find((x) => x.persistent_id === values[0]) ?? null;
        if (sql.includes("INSERT INTO auth_rate_limits")) {
          const [keyHash, now, updatedAt, windowMs] = values;
          const previous = db.limits.get(keyHash);
          const inWindow =
            previous && updatedAt - previous.window_started_at < windowMs;
          const row = {
            key_hash: keyHash,
            window_started_at: inWindow ? previous.window_started_at : now,
            attempts: inWindow ? previous.attempts + 1 : 1,
            updated_at: updatedAt,
          };
          db.limits.set(keyHash, row);
          return row;
        }
        throw new Error("Unhandled first query: " + sql);
      },
      async run() {
        if (sql.includes("INSERT INTO auth_accounts")) {
          const [
            accountId,
            email,
            persistentId,
            salt,
            hash,
            iterations,
            verified,
            createdAt,
          ] = values;
          if (
            db.accounts.some(
              (x) => x.email === email || x.persistent_id === persistentId,
            )
          )
            throw new Error("UNIQUE constraint failed");
          db.accounts.push({
            account_id: accountId,
            email,
            persistent_id: persistentId,
            password_salt: salt,
            password_hash: hash,
            password_iterations: iterations,
            email_verified: verified,
            created_at: createdAt,
          });
          return { success: true };
        }
        if (sql.includes("DELETE FROM auth_rate_limits")) {
          db.limits.delete(values[0]);
          return { success: true };
        }
        throw new Error("Unhandled run query: " + sql);
      },
    };
  }
}

function makeEnv() {
  return { DB: new MemoryD1(), INTERNAL_AUTH_SECRET: SECRET };
}
async function call(env, path, body, auth = SECRET) {
  return worker.fetch(
    new Request("https://auth.test" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(auth === null ? {} : { authorization: "Bearer " + auth }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
  );
}
const credentials = (extra = {}) => ({
  email: "player@example.com",
  password: "Correct Horse Battery Staple 47!",
  persistentId: PERSISTENT_ID,
  ip: "203.0.113.10",
  ...extra,
});

it("registration preserves the verified guest persistent ID", async () => {
  const env = makeEnv();
  const response = await call(
    env,
    "/internal/register",
    credentials({ email: " Player@Example.com " }),
  );
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.email, "player@example.com");
  assert.equal(body.persistentId, PERSISTENT_ID);
  assert.equal(body.emailVerified, false);
});

it("duplicate registration is case-insensitive and does not create a second account", async () => {
  const env = makeEnv();
  assert.equal(
    (await call(env, "/internal/register", credentials())).status,
    201,
  );
  const second = await call(
    env,
    "/internal/register",
    credentials({
      email: " PLAYER@EXAMPLE.COM ",
      persistentId: "f8ee2ac5-324a-4e06-9a7d-4d137fa5bba1",
      ip: "203.0.113.11",
    }),
  );
  assert.equal(second.status, 409);
  assert.equal(env.DB.accounts.length, 1);
});

it("login restores the account persistent ID and wrong passwords are generic", async () => {
  const env = makeEnv();
  assert.equal(
    (await call(env, "/internal/register", credentials())).status,
    201,
  );
  const login = await call(env, "/internal/login", {
    email: "PLAYER@example.com",
    password: "Correct Horse Battery Staple 47!",
    ip: "203.0.113.12",
  });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).persistentId, PERSISTENT_ID);
  const wrong = await call(env, "/internal/login", {
    email: "player@example.com",
    password: "wrong password value",
    ip: "203.0.113.12",
  });
  assert.equal(wrong.status, 401);
  assert.deepEqual(await wrong.json(), { error: "invalid_credentials" });
});

it("identity lookup returns only the account associated with the persistent ID", async () => {
  const env = makeEnv();
  await call(env, "/internal/register", credentials());
  const found = await call(
    env,
    "/internal/identity?persistentId=" + PERSISTENT_ID,
  );
  assert.equal(found.status, 200);
  assert.equal((await found.json()).email, "player@example.com");
  const missing = await call(
    env,
    "/internal/identity?persistentId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  );
  assert.equal(missing.status, 404);
});

it("internal routes reject missing or incorrect service credentials", async () => {
  const env = makeEnv();
  assert.equal(
    (
      await call(
        env,
        "/internal/login",
        {
          email: "x@example.com",
          password: "not-a-valid-password",
          ip: "203.0.113.8",
        },
        null,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await call(
        env,
        "/internal/login",
        {
          email: "x@example.com",
          password: "not-a-valid-password",
          ip: "203.0.113.8",
        },
        "wrong",
      )
    ).status,
    401,
  );
});

it("failed logins are rate limited per normalized email and source IP", async () => {
  const env = makeEnv();
  const payload = {
    email: "player@example.com",
    password: "wrong password value",
    ip: "203.0.113.12",
  };
  let last;
  for (let i = 0; i < 12; i++)
    last = await call(env, "/internal/login", payload);
  assert.equal(last.status, 429);
});

it("registration throttles an abusive source IP even when it varies email addresses", async () => {
  const env = makeEnv();
  let last;
  for (let i = 0; i < 12; i++) {
    last = await call(
      env,
      "/internal/register",
      credentials({
        email: `player${i}@example.com`,
        persistentId: `f8ee2ac5-324a-4e06-9a7d-${String(i).padStart(12, "0")}`,
      }),
    );
  }
  assert.equal(last.status, 429);
});
