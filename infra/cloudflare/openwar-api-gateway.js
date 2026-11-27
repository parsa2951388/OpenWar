const UPSTREAM_ORIGIN = "https://api.openfront.io";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://open-war-online.onrender.com",
  "https://open-war-game.onrender.com",
  "http://localhost:9000",
  "http://localhost:5173",
];

const ROUTES = [
  {
    pattern: /^\/matchmaking\/(?:join|checkin)$/,
    group: "matchmaking",
    methods: ["GET", "POST"],
  },
  { pattern: /^\/join_verify$/, group: "join-verify", methods: ["POST"] },
  {
    pattern: /^\/cluster\/(?:checkin|lobbies)$/,
    group: "cluster",
    methods: ["GET", "POST"],
  },
  { pattern: /^\/map_weights$/, group: "map-weights", methods: ["GET"] },
  { pattern: /^\/cluster\.json$/, group: "cluster-list", methods: ["GET"] },
  { pattern: /^\/\.well-known\/jwks\.json$/, group: "jwks", methods: ["GET"] },
  {
    pattern: /^\/(?:cosmetics\.json|reserved_clan_tags)$/,
    group: "privileges",
    methods: ["GET"],
  },

  // Explicit authentication routes used by the Open War client. Keep this
  // closed; do not turn the gateway into an unrestricted /auth/* proxy.
  {
    pattern: /^\/auth\/login\/(?:discord|google|steam|token)$/,
    group: "auth",
    methods: ["GET"],
  },
  {
    pattern: /^\/auth\/link\/(?:google|steam)$/,
    group: "auth",
    methods: ["GET"],
  },
  {
    pattern:
      /^\/auth\/(?:google|google\/link|logout|revoke|refresh|steam|crazygames|poki|viverse|magic-link)$/,
    group: "auth",
    methods: ["POST"],
  },

  { pattern: /^\/player\/[^/]+$/, group: "player", methods: ["GET"] },
  {
    pattern: /^\/public\/player\/[^/]+(?:\/games)?$/,
    group: "public-player",
    methods: ["GET"],
  },
  {
    pattern: /^\/public\/tribe\/[^/]+$/,
    group: "public-tribe",
    methods: ["GET"],
  },
  {
    pattern: /^\/creators\/code\/[^/]+$/,
    group: "creator-lookup",
    methods: ["GET"],
  },

  {
    pattern: /^\/users\/@me$/,
    group: "user-profile",
    methods: ["GET", "DELETE"],
  },
  {
    pattern: /^\/users\/@me\/(?:level_visibility|search_visibility|username)$/,
    group: "user-profile",
    methods: ["PUT"],
  },
  {
    pattern: /^\/users\/@me\/identity_token$/,
    group: "user-profile",
    methods: ["POST"],
  },
  {
    pattern: /^\/users\/@me\/creator$/,
    group: "user-profile",
    methods: ["PUT", "DELETE"],
  },
  {
    pattern: /^\/users\/@me\/tribe_names$/,
    group: "user-profile",
    methods: ["GET", "POST"],
  },
  {
    pattern: /^\/users\/@me\/tribe_names\/[^/]+\/boosts$/,
    group: "user-profile",
    methods: ["POST"],
  },
  {
    pattern: /^\/users\/@me\/(?:ffa_rank_position)$/,
    group: "user-profile",
    methods: ["GET"],
  },
  {
    pattern: /^\/users\/@me\/(?:notices|messages\/seen)$/,
    group: "user-profile",
    methods: ["POST"],
  },
  {
    pattern: /^\/marketing\/consent$/,
    group: "account-settings",
    methods: ["POST"],
  },

  {
    pattern: /^\/shop\/purchase(?:\/pack)?$/,
    group: "shop",
    methods: ["POST"],
  },
  {
    pattern: /^\/rewards\/(?:claim-all|[^/]+\/claim)$/,
    group: "rewards",
    methods: ["POST"],
  },
  {
    pattern: /^\/payments\/(?:checkout|steam\/finalize|google\/finalize)$/,
    group: "payments",
    methods: ["POST"],
  },
  {
    pattern: /^\/subscriptions\/@me\/(?:cancel|change-tier|portal)$/,
    group: "subscriptions",
    methods: ["POST"],
  },

  { pattern: /^\/game\/[^/]+$/, group: "game-history", methods: ["GET"] },
  {
    pattern: /^\/leaderboard\/ranked(?:\/ffa(?:\/(?:all|[^/]+))?)?$/,
    group: "leaderboard",
    methods: ["GET"],
  },
  {
    pattern: /^\/leaderboard\/tribes$/,
    group: "leaderboard",
    methods: ["GET"],
  },
  {
    pattern: /^\/(?:news|streams)\.json$/,
    group: "public-config",
    methods: ["GET"],
  },
];

function routeFor(pathname) {
  return ROUTES.find((route) => route.pattern.test(pathname)) ?? null;
}

export function routeGroup(pathname) {
  return routeFor(pathname)?.group ?? null;
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

    const route = routeFor(pathname);
    if (!route) {
      return json({ error: "route_not_found" }, 404, origin, env);
    }

    if (request.method === "OPTIONS") {
      const headers = corsHeaders(origin, env);
      headers.set(
        "Access-Control-Allow-Methods",
        [...route.methods, "OPTIONS"].join(", "),
      );
      headers.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, X-Api-Key, Upgrade, Sec-WebSocket-Protocol",
      );
      headers.set("Access-Control-Max-Age", "600");
      return new Response(null, { status: 204, headers });
    }

    if (!route.methods.includes(request.method)) {
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
      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = request.body;
      }

      const upstream = await fetch(new Request(upstreamUrl.toString(), init));

      // Cloudflare Workers can pass an upgraded WebSocket Response through
      // unchanged. Rebuilding a 101 response would destroy the socket pair.
      if (upstream.status === 101) return upstream;

      if (upstream.status >= 500) {
        recordFailure(env, ctx, {
          routeGroup: route.group,
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
        routeGroup: route.group,
        method: request.method,
        status: 502,
        durationMs: Date.now() - startedAt,
      });
      return json({ error: "upstream_unavailable" }, 502, origin, env);
    }
  },
};
