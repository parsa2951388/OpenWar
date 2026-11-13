import { afterEach, describe, expect, test, vi } from "vitest";
import {
  publishAndVerifyRenderCluster,
  registerRenderCluster,
  renderApiOrigin,
} from "../../src/server/RenderClusterRegistry";

const VERSION = "0123456789abcdef0123456789abcdef01234567";
const API_ORIGIN = "https://openwar-api-gateway.parsaoj.workers.dev";

function renderEnvironment(): NodeJS.ProcessEnv {
  return {
    RENDER: "true",
    GAME_ENV: "prod",
    DOMAIN: "openfront.io",
    OPENWAR_API_ORIGIN: API_ORIGIN,
    API_KEY: "test-api-key",
    TURNSTILE_SITE_KEY: "live-site-key",
    RENDER_EXTERNAL_HOSTNAME: "open-war-online.onrender.com",
    RENDER_GIT_COMMIT: VERSION,
    GIT_COMMIT: VERSION,
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("renderApiOrigin", () => {
  test("uses the configured gateway as transport without changing the issuer domain", () => {
    const env = renderEnvironment();
    expect(renderApiOrigin(env)).toBe(API_ORIGIN);
    expect(env.DOMAIN).toBe("openfront.io");
  });

  test("rejects an insecure or path-scoped remote gateway", () => {
    expect(() =>
      renderApiOrigin({
        DOMAIN: "openfront.io",
        OPENWAR_API_ORIGIN: "http://gateway.example",
      }),
    ).toThrow(/HTTPS origin/);
    expect(() =>
      renderApiOrigin({
        DOMAIN: "openfront.io",
        OPENWAR_API_ORIGIN: "https://gateway.example/proxy",
      }),
    ).toThrow(/HTTPS origin/);
  });
});

describe("registerRenderCluster", () => {
  test("registers the Render site and game host and installs the registry identity", async () => {
    const env = renderEnvironment();
    const fetchFn = vi.fn(async () =>
      jsonResponse({ letter: "c", numWorkers: 3 }),
    );

    await expect(
      registerRenderCluster({
        env,
        fetchFn: fetchFn as unknown as typeof fetch,
        cpuCount: 2,
      }),
    ).resolves.toEqual({
      site: "open-war-online.onrender.com",
      host: "open-war-online.onrender.com",
      letter: "c",
      numWorkers: 3,
    });

    expect(env.SITE_HOST).toBe("open-war-online.onrender.com");
    expect(env.INSTANCE_LETTER).toBe("c");
    expect(env.NUM_WORKERS).toBe("3");
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [input, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(input).toBe(`${API_ORIGIN}/cluster/register`);
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe(
      "test-api-key",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      site: "open-war-online.onrender.com",
      host: "open-war-online.onrender.com",
      cpus: 2,
    });
  });

  test("uses distinct configured page and game hosts when a proxy is present", async () => {
    const env = renderEnvironment();
    env.SITE_HOST = "open-war-online.onrender.com";
    env.GAME_HOST = "open-war-game.onrender.com";
    const fetchFn = vi.fn(async () =>
      jsonResponse({ letter: "d", numWorkers: 1 }),
    );

    const identity = await registerRenderCluster({
      env,
      fetchFn: fetchFn as unknown as typeof fetch,
      cpuCount: 1,
    });

    expect(identity).toMatchObject({
      site: "open-war-online.onrender.com",
      host: "open-war-game.onrender.com",
    });
    expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({
      site: "open-war-online.onrender.com",
      host: "open-war-game.onrender.com",
      cpus: 1,
    });
  });

  test("does not re-register an identity already provisioned by an operator", async () => {
    const env = renderEnvironment();
    env.INSTANCE_LETTER = "b";
    env.NUM_WORKERS = "4";
    const fetchFn = vi.fn();

    await expect(
      registerRenderCluster({
        env,
        fetchFn: fetchFn as unknown as typeof fetch,
      }),
    ).resolves.toEqual({
      site: "open-war-online.onrender.com",
      host: "open-war-online.onrender.com",
      letter: "b",
      numWorkers: 4,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test("fails closed when the API registry does not recognise the site", async () => {
    const env = renderEnvironment();
    const fetchFn = vi.fn(async () => jsonResponse({ error: "unknown_site" }, 404));

    await expect(
      registerRenderCluster({
        env,
        fetchFn: fetchFn as unknown as typeof fetch,
        cpuCount: 1,
      }),
    ).rejects.toThrow(/HTTP 404/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(String(fetchFn.mock.calls[0]?.[1]?.headers)).not.toContain(
      "test-api-key",
    );
  });

  test("does not expose the API key in registration errors", async () => {
    const env = renderEnvironment();
    const fetchFn = vi.fn(async () => jsonResponse({ error: "forbidden" }, 403));

    await expect(
      registerRenderCluster({
        env,
        fetchFn: fetchFn as unknown as typeof fetch,
        cpuCount: 1,
      }),
    ).rejects.toThrow(/HTTP 403/);
  });

  test("retries transient registry failures", async () => {
    const env = renderEnvironment();
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 503))
      .mockResolvedValueOnce(jsonResponse({ letter: "a", numWorkers: 2 }));

    await expect(
      registerRenderCluster({
        env,
        fetchFn: fetchFn as unknown as typeof fetch,
        cpuCount: 2,
        attempts: 2,
        retryDelayMs: 0,
        sleepFn: async () => undefined,
      }),
    ).resolves.toMatchObject({ letter: "a", numWorkers: 2 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("publishAndVerifyRenderCluster", () => {
  const identity = {
    site: "open-war-online.onrender.com",
    host: "open-war-online.onrender.com",
    letter: "c",
    numWorkers: 3,
  };

  test("publishes the running commit and verifies that the registry marks it open", async () => {
    const env = renderEnvironment();
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/cluster/latest") return new Response(null, { status: 204 });
      if (url.pathname === "/cluster.json") {
        return jsonResponse({
          latest: VERSION,
          servers: {
            c: {
              host: identity.host,
              numWorkers: identity.numWorkers,
              version: VERSION,
              state: "open",
            },
          },
        });
      }
      return jsonResponse({ error: "not_found" }, 404);
    });

    await expect(
      publishAndVerifyRenderCluster(identity, {
        env,
        fetchFn: fetchFn as unknown as typeof fetch,
      }),
    ).resolves.toBeUndefined();

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const [publishUrl, publishInit] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(publishUrl).toBe(`${API_ORIGIN}/cluster/latest`);
    expect(publishInit.method).toBe("POST");
    expect(publishInit.redirect).toBe("error");
    expect((publishInit.headers as Record<string, string>)["x-api-key"]).toBe(
      "test-api-key",
    );
    expect(JSON.parse(String(publishInit.body))).toEqual({
      site: identity.site,
      version: VERSION,
    });

    const [listUrl, listInit] = fetchFn.mock.calls[1] as unknown as [
      URL,
      RequestInit,
    ];
    expect(listUrl.pathname).toBe("/cluster.json");
    expect(listUrl.searchParams.get("site")).toBe(identity.site);
    expect(listInit.method).toBe("GET");
    expect(listInit.headers).toEqual({ "Cache-Control": "no-cache" });
  });

  test("does not claim readiness when the API reports an unknown site", async () => {
    const env = renderEnvironment();
    const fetchFn = vi.fn(async () => jsonResponse({ error: "unknown_site" }, 404));

    await expect(
      publishAndVerifyRenderCluster(identity, {
        env,
        fetchFn: fetchFn as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/does not recognise this Open War site/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("rejects a cluster entry that points at a different host", async () => {
    const env = renderEnvironment();
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/cluster/latest") return new Response(null, { status: 204 });
      return jsonResponse({
        latest: VERSION,
        servers: {
          c: {
            host: "other.example.com",
            numWorkers: identity.numWorkers,
            version: VERSION,
            state: "open",
          },
        },
      });
    });

    await expect(
      publishAndVerifyRenderCluster(identity, {
        env,
        fetchFn: fetchFn as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/bound to a different game host/);
  });
});
