const UPSTREAM_ORIGIN = "https://api.openfront.io";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://open-war-online.onrender.com",
  "https://open-war-live.onrender.com",
  "http://localhost:9000",
  "http://localhost:5173",
];

const ROUTES = [
  [/^\/matchmaking\/(?:join|checkin)$/, "matchmaking"],
  [/^\/cluster\/register$/, "cluster-register"],
  [/^\/cluster\/latest$/, "cluster-latest"],
  [/^\/cluster\/(?:checkin|lobbies)$/, "cluster"],
  [/^\/map_weights$/, "map-weights"],
  [/^\/cluster\.json$/, "cluster-list"],
  [/^\/\.well-known\/jwks\.json$/, "jwks"],
  [/^\/join_verify$/, "join-verify"],
  [/^\/(?:cosmetics\.json|reserved_clan_tags)$/, "privileges"],
  [/^\/users\/@me$/, "user-profile"],
];

function routeGroup(pathname) {
  return ROUTES.find(([pattern]) => pattern.test(pathname))?.[1] ?? null;
}

function allowedOrigins(env) {
  const configured = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

function corsHeaders(origin, env) {
  const headers = new Headers();
  if (origin && allowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Expose-Headers", "Content-Range, Retry-After");
    headers.set("Vary", "Origin");
  }
  return headers;
}

function json(body, status, origin, env) {
  const headers = corsHeaders(origin, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
}

function recordFailure(env, ctx, event) {
  if (!env.EVENTS_DB) return;
  const write = env.EVENTS_DB.prepare(
    "INSERT INTO gateway_failures (route_group, method, status, duration_ms, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(
      event.routeGroup,
      event.method,
      event.status,
      event.durationMs,
      Date.now(),
    )
    .run()
    .catch(() => undefined);
  ctx.waitUntil(write);
}

async function health(env, origin) {
  try {
    const row = await env.EVENTS_DB.prepare(
      "SELECT COUNT(*) AS failures FROM gateway_failures WHERE created_at >= ?",
    )
      .bind(Date.now() - 60 * 60 * 1000)
      .first();
    return json(
      {
        service: "openwar-api-gateway",
        status: "ok",
        upstream: new URL(UPSTREAM_ORIGIN).host,
        storage: "ok",
        failuresLastHour: Number(row?.failures ?? 0),
      },
      200,
      origin,
      env,
    );
  } catch {
    return json(
      {
        service: "openwar-api-gateway",
        status: "degraded",
        storage: "unavailable",
      },
      503,
      origin,
      env,
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const incoming = new URL(request.url);
    const origin = request.headers.get("Origin");
    const pathname = incoming.pathname;

    if (origin && !allowedOrigins(env).has(origin)) {
      return json({ error: "origin_not_allowed" }, 403, null, env);
    }

    if (pathname === "/__health" && request.method === "GET") {
      return health(env, origin);
    }

    const group = routeGroup(pathname);
    if (!group) {
      return json({ error: "route_not_found" }, 404, origin, env);
    }

    // Registration and release promotion mutate the shared server registry.
    // They are strictly server-to-server operations and must never be exposed
    // to browser-origin requests, even from an allowed frontend origin.
    const registryMutation =
      pathname === "/cluster/register" || pathname === "/cluster/latest";
    if (registryMutation && origin) {
      return json({ error: "server_to_server_only" }, 403, null, env);
    }
    if (
      registryMutation &&
      request.method !== "POST" &&
      request.method !== "OPTIONS"
    ) {
      return json({ error: "method_not_allowed" }, 405, origin, env);
    }

    if (request.method === "OPTIONS") {
      const headers = corsHeaders(origin, env);
      headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      headers.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, X-Api-Key, Upgrade, Sec-WebSocket-Protocol",
      );
      headers.set("Access-Control-Max-Age", "600");
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "GET" && request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, origin, env);
    }

    const startedAt = Date.now();
    const upstreamUrl = new URL(
      incoming.pathname + incoming.search,
      UPSTREAM_ORIGIN,
    );
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.set("x-forwarded-host", incoming.host);

    try {
      const init = {
        method: request.method,
        headers,
        redirect: "manual",
      };
      if (request.method !== "GET") {
        init.body = request.body;
        // Node's Fetch implementation requires duplex when forwarding a
        // streamed request body. Cloudflare Workers accept this standard
        // compatibility hint as well.
        init.duplex = "half";
      }

      const upstream = await fetch(new Request(upstreamUrl.toString(), init));

      // Cloudflare Workers can pass an upgraded WebSocket Response through
      // unchanged. Rebuilding a 101 response would destroy the socket pair.
      if (upstream.status === 101) return upstream;

      if (upstream.status >= 500) {
        recordFailure(env, ctx, {
          routeGroup: group,
          method: request.method,
          status: upstream.status,
          durationMs: Date.now() - startedAt,
        });
      }

      const responseHeaders = new Headers(upstream.headers);
      responseHeaders.delete("Access-Control-Allow-Origin");
      responseHeaders.delete("Access-Control-Allow-Credentials");
      for (const [name, value] of corsHeaders(origin, env)) {
        responseHeaders.set(name, value);
      }
      responseHeaders.set("X-OpenWar-Gateway", "1");

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch {
      recordFailure(env, ctx, {
        routeGroup: group,
        method: request.method,
        status: 502,
        durationMs: Date.now() - startedAt,
      });
      return json({ error: "upstream_unavailable" }, 502, origin, env);
    }
  },
};
