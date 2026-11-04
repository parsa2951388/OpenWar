import { Pool } from "@neondatabase/serverless";
import { ServerEnv } from "./ServerEnv";

export type AuthDbClient = Awaited<ReturnType<Pool["connect"]>>;

let pool: Pool | null = null;

/**
 * The auth database is deliberately separate from the game-state database.
 * The connection string is read only by the server and is never serialized
 * into BOOTSTRAP_CONFIG or returned by an HTTP endpoint.
 */
export function getAuthPool(): Pool {
  const connectionString = ServerEnv.authDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for account authentication");
  }

  if (pool === null) {
    pool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 8_000,
      idleTimeoutMillis: 30_000,
      maxLifetimeSeconds: 300,
    });
  }

  return pool;
}

export async function withAuthTransaction<T>(
  work: (client: AuthDbClient) => Promise<T>,
): Promise<T> {
  const client = await getAuthPool().connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** A low-cost readiness probe; never returns database credentials or metadata. */
export async function checkAuthDatabase(): Promise<boolean> {
  try {
    await getAuthPool().query("SELECT 1");
    return true;
  } catch (error) {
    return false;
  }
}
