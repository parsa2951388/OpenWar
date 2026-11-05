import express from "express";
import http from "http";
import type { AddressInfo } from "net";
import { describe, expect, test } from "vitest";
import {
  applySecurityHeaders,
  securityHeaders,
} from "../../src/server/SecurityHeaders";

describe("security headers", () => {
  test("sets safe baseline browser headers", () => {
    const headers = new Map<string, string>();
    applySecurityHeaders((name, value) => headers.set(name, value));
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("X-Permitted-Cross-Domain-Policies")).toBe("none");
    expect(headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });

  test("adds headers to real Express responses", async () => {
    const app = express();
    app.use(securityHeaders);
    app.get("/health", (_req, res) => res.json({ ok: true }));
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://127.0.0.1:${address.port}/health`);
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("referrer-policy")).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(response.headers.get("permissions-policy")).toContain(
        "camera=()",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
