import { afterEach, describe, expect, it, vi } from "vitest";
import gateway from "../../cloudflare/openwar-api-gateway/src/index.js";

const LIVE_STATIC_ORIGIN = "https://open-war-live.onrender.com";
const GATEWAY_URL = "https://openwar-api-gateway.parsaoj.workers.dev";

function context() {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    ctx: {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise);
      },
    },
  };
}

describe("Open War API gateway", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows the deployed static frontend origin on CORS preflight", async () => {
    const { ctx } = context();
    const response = await gateway.fetch(
      new Request(`${GATEWAY_URL}/cluster/checkin`, {
        method: "OPTIONS",
        headers: {
          Origin: LIVE_STATIC_ORIGIN,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type,x-api-key",
        },
      }),
      {},
      ctx,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      LIVE_STATIC_ORIGIN,
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "POST",
    );
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "X-Api-Key",
    );
  });

  it("rejects unregistered browser origins without reflecting them", async () => {
    const { ctx } = context();
    const response = await gateway.fetch(
      new Request(`${GATEWAY_URL}/cluster.json?site=unknown.example`, {
        headers: { Origin: "https://attacker.example" },
      }),
      {},
      ctx,
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "origin_not_allowed" });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("keeps the upstream path allowlist closed", async () => {
    const { ctx } = context();
    const response = await gateway.fetch(
      new Request(`${GATEWAY_URL}/admin/export`, {
        headers: { Origin: LIVE_STATIC_ORIGIN },
      }),
      {},
      ctx,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "route_not_found" });
  });

  it("proxies join verification to the fixed upstream origin", async () => {
    const { ctx } = context();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "approved",
          username: "Alice",
          clanTag: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await gateway.fetch(
      new Request(`${GATEWAY_URL}/join_verify`, {
        method: "POST",
        headers: {
          Origin: LIVE_STATIC_ORIGIN,
          "Content-Type": "application/json",
          "X-Api-Key": "test-api-key",
        },
        body: JSON.stringify({
          ip: "192.0.2.10",
          token: "test-token",
          username: "Alice",
          clanTag: null,
        }),
      }),
      {},
      ctx,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "approved",
      username: "Alice",
    });
    const [upstreamRequest] = fetchMock.mock.calls[0] as [Request];
    expect(upstreamRequest.url).toBe("https://api.openfront.io/join_verify");
    expect(upstreamRequest.method).toBe("POST");
    expect(upstreamRequest.headers.get("X-Api-Key")).toBe("test-api-key");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      LIVE_STATIC_ORIGIN,
    );
    expect(response.headers.get("X-OpenWar-Gateway")).toBe("1");
  });

  it("reports gateway health only when D1 storage is reachable", async () => {
    const { ctx } = context();
    const env = {
      EVENTS_DB: {
        prepare: () => ({
          bind: () => ({
            first: async () => ({ failures: 3 }),
          }),
        }),
      },
    };
    const response = await gateway.fetch(
      new Request(`${GATEWAY_URL}/__health`, {
        headers: { Origin: LIVE_STATIC_ORIGIN },
      }),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      service: "openwar-api-gateway",
      status: "ok",
      upstream: "api.openfront.io",
      storage: "ok",
      failuresLastHour: 3,
    });
  });
});
