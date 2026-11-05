import type { NextFunction, Request, Response } from "express";

/**
 * Baseline browser hardening shared by the master and game-worker HTTP apps.
 * A global CSP needs a provider-specific allowlist and is intentionally not
 * guessed here; TLS may terminate outside the application container.
 */
export function applySecurityHeaders(
  setHeader: (name: string, value: string) => void,
): void {
  setHeader("X-Content-Type-Options", "nosniff");
  setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  setHeader("X-Permitted-Cross-Domain-Policies", "none");
  setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  applySecurityHeaders(res.setHeader.bind(res));
  next();
}
