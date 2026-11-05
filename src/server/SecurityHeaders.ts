import type { RequestHandler } from "express";
import { ServerEnv } from "./ServerEnv";

/**
 * Baseline response hardening shared by the master and game-worker HTTP apps.
 *
 * Deliberately does not set CSP, frame restrictions, COOP or COEP here:
 * OpenWar is embedded by game portals and loads cross-origin game assets and
 * auth integrations. Those policies require an explicit deployment allowlist
 * and browser regression coverage before they can be enforced safely.
 */
export function createSecurityHeaders(
  environment: string = ServerEnv.gameEnvName(),
): RequestHandler {
  return (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // HSTS is meaningful only on the public HTTPS production origin. Render
    // terminates TLS before the internal nginx/Node hop, so don't infer this
    // from req.secure or X-Forwarded-Proto inside the container.
    if (environment === "prod") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    }

    next();
  };
}