import { describe, expect, it, vi } from "vitest";
import { createSecurityHeaders } from "../../src/server/SecurityHeaders";

function responseDouble() {
  const headers = new Map<string, string>();
  return {
    headers,
    response: {
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
    } as any,
  };
}

describe("createSecurityHeaders", () => {
  it("sets safe baseline headers and HSTS in production", () => {
    const { headers, response } = responseDouble();
    const next = vi.fn();
    createSecurityHeaders("prod")({} as any, response, next);
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(next).toHaveBeenCalledOnce();
  });

  it("does not set HSTS in development or staging", () => {
    for (const environment of ["dev", "staging"]) {
      const { headers, response } = responseDouble();
      const next = vi.fn();
      createSecurityHeaders(environment)({} as any, response, next);
      expect(headers.has("Strict-Transport-Security")).toBe(false);
      expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(next).toHaveBeenCalledOnce();
    }
  });
});