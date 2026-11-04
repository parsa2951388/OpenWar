import type { Express } from "express";
import { authDatabaseConfigured, ensureAuthDatabase } from "./AuthDatabase";
import { ServerEnv } from "./ServerEnv";

/**
 * Read-only readiness information for the standalone account system.
 * Never expose OAuth credentials, database URLs, signing keys or mail tokens.
 */
export function registerSelfHostedAuthStatusRoute(app: Express): void {
  app.get("/auth/status", async (_req, res) => {
    const configured = authDatabaseConfigured();
    let database: "ready" | "not_configured" | "unavailable" =
      configured ? "unavailable" : "not_configured";

    if (configured) {
      try {
        await ensureAuthDatabase();
        database = "ready";
      } catch (error) {
        console.error(
          "Auth database readiness check failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }

    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.status(database === "ready" ? 200 : 503).json({
      enabled: true,
      database,
      providers: {
        google: Boolean(
          ServerEnv.googleClientId() && ServerEnv.googleClientSecret(),
        ),
        discord: Boolean(
          ServerEnv.discordClientId() && ServerEnv.discordClientSecret(),
        ),
      },
      emailDelivery: Boolean(
        ServerEnv.emailApiKey() && ServerEnv.emailFrom(),
      ),
      authOrigin: ServerEnv.authOrigin(),
    });
  });
}
