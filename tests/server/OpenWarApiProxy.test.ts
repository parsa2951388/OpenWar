import { describe, expect, it, vi } from "vitest";
import { forwardOpenWarApiRequest } from "../../src/server/OpenWarApiProxy";

const host = "open-war-v2-solo-test.onrender.com";
const origin = `https://${host}`;

describe("same-origin Open War API proxy", () => {
  it("forwards the server registry request to the OpenFront API", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ a: { host, numWorkers: 1 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await forwardOpenWarApiRequest(
      {
        method: "GET",
        pathname: "/cluster.json",
        search: "?site=open-war-v2-solo-test.onrender.com",
        host,
        origin,
        headers: new Headers({
          authorization: "Bearer player-token",
          "x-api-key": "openwar-test-key",
          origin,
        }),
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.openfront.io/cluster.json?site=open-war-v2-solo-test.onrender.com",
    );
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer player-token",
    );
    expect(new Headers(init?.headers).get("x-api-key")).toBe("openwar-test-key");
    expect(new Headers(init?.headers).has("origin")).toBe(false);
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({
      a: { host, numWorkers: 1 },
    });
  });

  it("forwards server check-in JSON without exposing a cross-origin request", async () => {
    const payload = {
      site: host,
      letter: "a",
      host,
      version: "0123456789012345678901234567890123456789",
      numWorkers: 1,
      liveGames: 0,
    };
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ state: "open" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await forwardOpenWarApiRequest(
      {
        method: "POST",
        pathname: "/cluster/checkin",
        search: "",
        host,
        origin,
        headers: new Headers({
          "content-type": "application/json",
          "x-api-key": "openwar-test-key",
          origin,
        }),
        body: payload,
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(payload);
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ state: "open" });
  });

  it("rejects foreign browser origins before reaching the upstream", async () => {
    const fetchMock = vi.fn();

    const response = await forwardOpenWarApiRequest(
      {
        method: "GET",
        pathname: "/cluster.json",
        search: "?site=attacker.example",
        host,
        origin: "https://attacker.example",
        headers: new Headers({ origin: "https://attacker.example" }),
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: "origin_not_allowed" });
  });

  it("does not proxy paths outside the explicit API route allowlist", async () => {
    const fetchMock = vi.fn();

    const response = await forwardOpenWarApiRequest(
      {
        method: "GET",
        pathname: "/admin/secrets",
        search: "",
        host,
        origin,
        headers: new Headers({ origin }),
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(response).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns method_not_allowed for a method outside a known route", async () => {
    const fetchMock = vi.fn();

    const response = await forwardOpenWarApiRequest(
      {
        method: "DELETE",
        pathname: "/cluster.json",
        search: "",
        host,
        origin,
        headers: new Headers({ origin }),
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response?.status).toBe(405);
    expect(await response?.json()).toEqual({ error: "method_not_allowed" });
  });
});
