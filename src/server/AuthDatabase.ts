import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type PoolClient } from "pg";
import { ServerEnv } from "./ServerEnv";

let pool: Pool | null = null;
let migrationPromise: Promise<void> | null = null;

export function authDatabaseConfigured(): boolean {
  return ServerEnv.authDatabaseUrl().length > 0;
}

export function authPool(): Pool {
  if (!authDatabaseConfigured()) {
    throw new Error("DATABASE_URL is required for account authentication");
  }

  if (pool === null) {
    pool = new Pool({
      connectionString: ServerEnv.authDatabaseUrl(),
      max: ServerEnv.authDatabasePoolMax(),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      application_name: "open-war-auth",
    });
    pool.on("error", (error) => {
      // Never print connection strings or SQL parameters.
      console.error("Open War auth database pool error:", error.message);
    });
  }

  return pool;
}

/**
 * Apply numbered SQL migrations once per process. A PostgreSQL advisory lock
 * serializes simultaneous starts, including rolling deploy overlap.
 */
export async function ensureAuthDatabase(): Promise<void> {
  if (migrationPromise !== null) return migrationPromise;

  migrationPromise = (async () => {
    const db = authPool();
    const client = await db.connect();
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../database/migrations",
    );
    const migrations = [
      ["0001_authentication_foundation", "0001_authentication_foundation.sql"],
      [
        "0002_auth_session_replay_and_oauth_binding",
        "0002_auth_session_replay_and_oauth_binding.sql",
      ],
    ] as const;

    let lockAcquired = false;
    try {
      await client.query("SELECT pg_advisory_lock(hashtext($1))", [
        "open-war-auth-schema",
      ]);
      lockAcquired = true;
      await client.query(
        "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
      );

      for (const [version, filename] of migrations) {
        const existing = await client.query(
          "SELECT 1 FROM schema_migrations WHERE version = $1",
          [version],
        );
        if (existing.rowCount) continue;

        const sql = await readFile(path.join(root, filename), "utf8");
        await client.query(sql);
        const confirmed = await client.query(
          "SELECT 1 FROM schema_migrations WHERE version = $1",
          [version],
        );
        if (!confirmed.rowCount) {
          throw new Error(`Migration ${version} did not record completion`);
        }
      }
    } finally {
      if (lockAcquired) {
        await client
          .query("SELECT pg_advisory_unlock(hashtext($1))", [
            "open-war-auth-schema",
          ])
          .catch(() => {});
      }
      client.release();
    }
  })().catch((error) => {
    migrationPromise = null;
    throw error;
  });

  return migrationPromise;
}

export async function authTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  await ensureAuthDatabase();
  const client = await authPool().connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
