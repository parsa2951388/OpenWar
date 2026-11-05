import type { NextFunction, Request, Response } from "express";

/**
 * Baseline browser hardening shared by the master and game-worker HTTP apps.
 * CSP and HSTS are intentionally managed at the public edge: this app can be
 * embedded by approved game portals and TLS terminates outside the container.
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
