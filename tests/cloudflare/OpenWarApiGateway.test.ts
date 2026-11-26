import { afterEach, describe, expect, test, vi } from "vitest";
import gateway from "../../cloudflare/openwar-api-gateway/src/index.js";

type GatewayEnvironment = Record<string, unknown>;
type GatewayContext = { waitUntil: (promise: Promise<unknown>) => void };

const context: GatewayContext = { waitUntil: vi.fn() };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("Open War API gateway cluster registry routes", () => {
  test.each(["/cluster/register", "/cluster/latest"])(
    "forwards %s only as a server-to-server POST with the API key",
    async (path) => {
      const upstreamFetch = vi.fn(
        async (_request: Request) =>
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      vi.stubGlobal("fetch", upstreamFetch);

      const request = new Request(`https://gateway.example.com${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": "server-secret",
        },
        body: JSON.stringify({ site: "open-war-online.onrender.com" }),
      });

      const response = await gateway.fetch(
        request,
        {} as GatewayEnvironment,
        context,
      );

      expect(response.status).toBe(200);
      expect(upstreamFetch).toHaveBeenCalledTimes(1);
      const forwarded = upstreamFetch.mock.calls[0][0] as Request;
      expect(forwarded.url).toBe(`https://api.openfront.io${path}`);
      expect(forwarded.method).toBe("POST");
      expect(forwarded.redirect).toBe("manual");
      expect(forwarded.headers.get("x-api-key")).toBe("server-secret");
      expect(await forwarded.json()).toEqual({
        site: "open-war-online.onrender.com",
      });
      expect(response.headers.get("X-OpenWar-Gateway")).toBe("1");
    },
  );

  test("blocks registry mutation requests carrying a browser Origin header", async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);

    const request = new Request(
      "https://gateway.example.com/cluster/register",
      {
        method: "POST",
        headers: {
          Origin: "https://open-war-online.onrender.com",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ site: "open-war-online.onrender.com" }),
      },
    );

    const response = await gateway.fetch(
      request,
      {} as GatewayEnvironment,
      context,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "server_to_server_only",
    });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  test("blocks browser-originated join verification requests", async () => {
    const upstreamFetch = vi.fn();
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await gateway.fetch(
      new Request("https://gateway.example.com/join_verify", {
        method: "POST",
        headers: {
          Origin: "https://open-war-online.onrender.com",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: "not-a-real-token" }),
      }),
      {} as GatewayEnvironment,
      context,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "server_to_server_only",
    });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  test.each(["GET", "PUT", "DELETE"])(
    "rejects %s on a registry mutation endpoint",
    async (method) => {
      const upstreamFetch = vi.fn();
      vi.stubGlobal("fetch", upstreamFetch);

      const response = await gateway.fetch(
        new Request("https://gateway.example.com/cluster/latest", { method }),
        {} as GatewayEnvironment,
        context,
      );

      expect(response.status).toBe(405);
      expect(upstreamFetch).not.toHaveBeenCalled();
    },
  );

  test("keeps the cluster list public and read-only", async () => {
    const upstreamFetch = vi.fn(
      async (_request: Request) =>
        new Response(
          JSON.stringify({
            latest: "0123456789abcdef0123456789abcdef01234567",
            servers: {},
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", upstreamFetch);

    const response = await gateway.fetch(
      new Request(
        "https://gateway.example.com/cluster.json?site=open-war-online.onrender.com",
      ),
      {} as GatewayEnvironment,
      context,
    );

    expect(response.status).toBe(200);
    const forwarded = upstreamFetch.mock.calls[0][0] as Request;
    expect(forwarded.url).toBe(
      "https://api.openfront.io/cluster.json?site=open-war-online.onrender.com",
    );
    expect(forwarded.method).toBe("GET");
    expect(forwarded.headers.get("x-api-key")).toBeNull();
  });
});
