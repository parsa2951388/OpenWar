import { afterEach, describe, expect, it, vi } from "vitest";
import gateway, {
  routeGroup,
} from "../infra/cloudflare/openwar-api-gateway.js";

const allowedOrigin = "https://open-war-live.onrender.com";
const context = { waitUntil: () => undefined };
const env = { ALLOWED_ORIGINS: allowedOrigin };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Open War API gateway route allowlist", () => {
  it.each([
    "/auth/login/discord",
    "/auth/login/google",
    "/auth/login/steam",
    "/auth/login/token",
    "/auth/google",
    "/auth/google/link",
    "/auth/link/google",
    "/auth/link/steam",
    "/auth/logout",
    "/auth/revoke",
    "/auth/refresh",
    "/auth/steam",
    "/auth/crazygames",
    "/auth/poki",
    "/auth/viverse",
    "/auth/magic-link",
  ])("allows the client authentication endpoint %s", (pathname) => {
    expect(routeGroup(pathname)).toBe("auth");
  });

  it.each([
    "/auth/admin",
    "/auth/debug",
    "/auth/session",
    "/auth/login/facebook",
    "/auth/link/admin",
  ])("does not open an unlisted authentication endpoint %s", (pathname) => {
    expect(routeGroup(pathname)).toBeNull();
  });

  it.each([
    ["/users/@me", "GET", "user-profile"],
    ["/users/@me", "DELETE", "user-profile"],
    ["/users/@me/username", "PUT", "user-profile"],
    ["/users/@me/creator", "DELETE", "user-profile"],
    ["/users/@me/tribe_names/123/boosts", "POST", "user-profile"],
    ["/public/player/123/games", "GET", "public-player"],
    ["/leaderboard/ranked/ffa/diamond", "GET", "leaderboard"],
    ["/payments/google/finalize", "POST", "payments"],
  ])("maps client API endpoint %s to group %s", (pathname, _method, group) => {
    expect(routeGroup(pathname)).toBe(group);
  });

  it("forwards the Google OAuth redirect and preserves its Location header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: "https://accounts.google.com/o/oauth2/auth" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request(
      "https://openwar-api-gateway.parsaoj.workers.dev/auth/login/google?redirect_uri=https%3A%2F%2Fopen-war-live.onrender.com",
      { headers: { Origin: allowedOrigin } },
    );
    const response = await gateway.fetch(request, env, context);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0].url).toBe(
      "https://api.openfront.io/auth/login/google?redirect_uri=https%3A%2F%2Fopen-war-live.onrender.com",
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/auth",
    );
    expect(response.headers.get("access-control-allow-origin")).toBe(
      allowedOrigin,
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
    expect(response.headers.get("x-openwar-gateway")).toBe("1");
  });

  it("rejects unlisted auth paths before reaching the upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await gateway.fetch(
      new Request("https://openwar-api-gateway.parsaoj.workers.dev/auth/admin"),
      env,
      context,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "route_not_found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects methods that are not explicitly allowed for a route", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await gateway.fetch(
      new Request(
        "https://openwar-api-gateway.parsaoj.workers.dev/auth/login/google",
        { method: "POST" },
      ),
      env,
      context,
    );

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "method_not_allowed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an untrusted browser origin", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await gateway.fetch(
      new Request(
        "https://openwar-api-gateway.parsaoj.workers.dev/auth/login/google",
        { headers: { Origin: "https://attacker.example" } },
      ),
      env,
      context,
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "origin_not_allowed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("advertises only the HTTP methods allowed for a route", async () => {
    const response = await gateway.fetch(
      new Request(
        "https://openwar-api-gateway.parsaoj.workers.dev/users/@me/username",
        {
          method: "OPTIONS",
          headers: { Origin: allowedOrigin },
        },
      ),
      env,
      context,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "PUT, OPTIONS",
    );
  });
});
