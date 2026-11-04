import type { TokenPayload } from "@openfront/shared/ApiSchemas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _clearInFlightTokens,
  _inFlightTokenCount,
  clientAuth,
  isSteamAuthenticated,
  planJoinVerify,
  verifyJoin,
} from "../../src/server/JoinVerify";

// verifyJoin resolves its endpoint from ServerEnv.jwtIssuer(), which throws
// if DOMAIN is unset.
process.env.DOMAIN ??= "localhost";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 300, status, json: async () => body };
}

describe("verifyJoin", () => {
  beforeEach(() => {
    // The game server verifies the single-use token directly with Cloudflare.
    vi.stubEnv("TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    _clearInFlightTokens();
  });

  it("verifies a token with Cloudflare and locally screens the supplied identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    const verdict = await verifyJoin("1.2.3.4", "tok", "xXblackxX", "CoOl");

    expect(verdict).toEqual({
      status: "approved",
      username: "xXblackxX",
      clanTag: "COOL",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({
      secret: "secret-key",
      response: "tok",
      remoteip: "1.2.3.4",
    });
  });

  it("normalizes a missing clan tag to null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: true })));
    expect(await verifyJoin("ip", "tok", "Alice", null)).toEqual({
      status: "approved",
      username: "Alice",
      clanTag: null,
    });
  });

  it("rejects an invalid Turnstile token and preserves Cloudflare error codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: false,
          "error-codes": ["timeout-or-duplicate"],
        }),
      ),
    );
    expect(await verifyJoin("ip", "tok", "Alice", null)).toEqual({
      status: "rejected",
      reason: "turnstile_failed",
      errorCodes: ["timeout-or-duplicate"],
    });
  });

  it("coalesces concurrent calls with the same token and identity", async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn().mockImplementation(() => fetchPromise);
    vi.stubGlobal("fetch", fetchMock);

    const call1 = verifyJoin("ip1", "shared-tok", "User1", null);
    const call2 = verifyJoin("ip2", "shared-tok", "User1", null);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch!(jsonResponse({ success: true }));

    const [v1, v2] = await Promise.all([call1, call2]);
    expect(v1).toEqual({ status: "approved", username: "User1", clanTag: null });
    expect(v2).toBe(v1);
    expect(_inFlightTokenCount()).toBe(0);
  });

  it("does not coalesce calls when identity or persistent ID differs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);

    const [a, b, c] = await Promise.all([
      verifyJoin("ip1", "shared-tok", "Alice", null, "pid-1"),
      verifyJoin("ip2", "shared-tok", "Bob", null, "pid-1"),
      verifyJoin("ip3", "shared-tok", "Alice", null, "pid-2"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect([a, b, c].every((result) => result.status === "approved")).toBe(true);
    expect(_inFlightTokenCount()).toBe(0);
  });

  it("does not call siteverify for reconnects without a token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await verifyJoin("ip", null, "Alice", null)).toEqual({
      status: "approved",
      username: "Alice",
      clanTag: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails open with a non-degraded error when siteverify is unavailable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    expect(await verifyJoin("ip", "tok", "Alice", null)).toMatchObject({
      status: "error",
      degraded: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails open on a malformed siteverify response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("malformed JSON");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await verifyJoin("ip", "tok", "Alice", null)).toMatchObject({
      status: "error",
      degraded: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("planJoinVerify", () => {
  const firstJoin = {
    isReadmit: false,
    gameStarted: false,
    turnstileToken: "tok" as string | null,
    identityUnchanged: false,
    steamAuthed: false,
  };
  const readmit = { ...firstJoin, isReadmit: true, turnstileToken: null };

  it("verifies a first join with its token", () => {
    expect(planJoinVerify(firstJoin)).toEqual({
      action: "verify",
      token: "tok",
    });
  });

  it("rejects a first join without a token", () => {
    expect(planJoinVerify({ ...firstJoin, turnstileToken: null })).toEqual({
      action: "reject",
    });
    expect(planJoinVerify({ ...firstJoin, turnstileToken: "" })).toEqual({
      action: "reject",
    });
  });

  // SECURITY: the skip paths must be unreachable for first joins — a skip
  // here would admit a player who never passed Turnstile.
  it("never skips a first join, whatever the game/identity state", () => {
    expect(
      planJoinVerify({
        ...firstJoin,
        gameStarted: true,
        identityUnchanged: true,
      }),
    ).toEqual({ action: "verify", token: "tok" });
    expect(
      planJoinVerify({
        ...firstJoin,
        turnstileToken: null,
        gameStarted: true,
        identityUnchanged: true,
      }),
    ).toEqual({ action: "reject" });
  });

  it("verifies a pre-start re-admit with a changed identity using a null token", () => {
    expect(planJoinVerify(readmit)).toEqual({ action: "verify", token: null });
  });

  // A stale token re-sent by the client must not reach the API: it was
  // already redeemed, so re-admits always verify with a null token.
  it("nulls out the token for re-admits even if the client re-sent one", () => {
    expect(planJoinVerify({ ...readmit, turnstileToken: "stale" })).toEqual({
      action: "verify",
      token: null,
    });
  });

  it("skips re-admits into a started game (identity updates no longer apply)", () => {
    expect(planJoinVerify({ ...readmit, gameStarted: true })).toEqual({
      action: "skip",
    });
  });

  it("skips re-admits whose identity is unchanged (already screened at admission)", () => {
    expect(planJoinVerify({ ...readmit, identityUnchanged: true })).toEqual({
      action: "skip",
    });
  });

  it("verifies a pre-start re-admit when stored identity is null (identityUnchanged is false)", () => {
    // When a client drops between verifyJoin and joinClient, isReadmit is true
    // but stored identity is null, resulting in identityUnchanged: false.
    expect(
      planJoinVerify({
        isReadmit: true,
        gameStarted: false,
        turnstileToken: null,
        identityUnchanged: false,
        steamAuthed: false,
      }),
    ).toEqual({ action: "verify", token: null });
  });

  it("verifies a Steam-authed first join with a null token (skips siteverify, keeps the name check)", () => {
    expect(planJoinVerify({ ...firstJoin, steamAuthed: true })).toEqual({
      action: "verify",
      token: null,
    });
  });

  // Steam ownership stands in for the token: a Steam-authed first join is never
  // rejected for a missing token, and never skips the API (name check still runs).
  it("verifies a Steam-authed first join with a null token even when no turnstile token is present", () => {
    expect(
      planJoinVerify({ ...firstJoin, steamAuthed: true, turnstileToken: null }),
    ).toEqual({ action: "verify", token: null });
  });

  it("ignores steamAuthed on re-admits (they already went through the gate)", () => {
    expect(planJoinVerify({ ...readmit, steamAuthed: true })).toEqual({
      action: "verify",
      token: null,
    });
  });
});

describe("isSteamAuthenticated", () => {
  function claims(provider?: string): TokenPayload {
    return {
      jti: "j",
      sub: "s",
      iat: 0,
      iss: "i",
      aud: "openfront.io",
      exp: 0,
      ...(provider ? { provider } : {}),
    } as TokenPayload;
  }

  it("is true only for a verified provider=steam claim", () => {
    expect(isSteamAuthenticated(claims("steam"))).toBe(true);
  });

  it("is false for a missing provider, a non-steam provider, and null claims", () => {
    expect(isSteamAuthenticated(claims())).toBe(false);
    expect(isSteamAuthenticated(claims("discord"))).toBe(false);
    expect(isSteamAuthenticated(null)).toBe(false);
  });
});

describe("clientAuth", () => {
  function claims(provider?: string): TokenPayload {
    return {
      jti: "j",
      sub: "s",
      iat: 0,
      iss: "i",
      aud: "openfront.io",
      exp: 0,
      ...(provider ? { provider } : {}),
    } as TokenPayload;
  }

  it("is account for any persistent provider", () => {
    for (const provider of ["discord", "google", "steam", "email", "poki"]) {
      expect(clientAuth(claims(provider))).toBe("account");
    }
  });

  it("is anonymous for no token, a guest session, and a token without a provider", () => {
    expect(clientAuth(null)).toBe("anonymous");
    expect(clientAuth(claims("guest"))).toBe("anonymous");
    expect(clientAuth(claims())).toBe("anonymous");
  });
});
