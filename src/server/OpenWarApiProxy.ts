import { routeMethods } from "../../infra/cloudflare/openwar-api-gateway.js";

export interface OpenWarApiProxyRequest {
  method: string;
  pathname: string;
  search: string;
  host: string;
  origin?: string;
  headers: Headers;
  body?: unknown;
}

const UPSTREAM_ORIGIN = "https://api.openfront.io";
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "user-agent",
  "x-api-key",
] as const;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function isSameOrigin(origin: string, host: string): boolean {
  try {
    return new URL(origin).origin === `https://${host}`;
  } catch {
    return false;
  }
}

/**
 * Forward only routes explicitly owned by the OpenFront account API.
 *
 * The Render-hosted solo-test instance uses this same-origin proxy so the
 * browser does not need a separate CORS allowlist entry in Cloudflare. This is
 * intentionally not a general-purpose URL proxy: the route and method must
 * exist in the shared gateway allowlist.
 */
export async function forwardOpenWarApiRequest(
  request: OpenWarApiProxyRequest,
  fetcher: typeof fetch = fetch,
): Promise<Response | null> {
  const methods = routeMethods(request.pathname);
  if (methods === null) return null;

  if (request.origin && !isSameOrigin(request.origin, request.host)) {
    return json({ error: "origin_not_allowed" }, 403);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, X-Api-Key",
        "Access-Control-Allow-Methods": [...methods, "OPTIONS"].join(", "),
        "Access-Control-Max-Age": "600",
        "Cache-Control": "no-store",
      },
    });
  }

  if (!methods.includes(request.method)) {
    return json({ error: "method_not_allowed" }, 405);
  }

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set("x-forwarded-host", request.host);
  headers.set("x-forwarded-proto", "https");

  const upstreamUrl = new URL(
    request.pathname + request.search,
    UPSTREAM_ORIGIN,
  );
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.body !== undefined) {
      init.body =
        typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
    }
  }

  try {
    const upstream = await fetcher(upstreamUrl.toString(), init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("Access-Control-Allow-Origin");
    responseHeaders.delete("Access-Control-Allow-Credentials");
    responseHeaders.delete("Access-Control-Allow-Headers");
    responseHeaders.delete("Access-Control-Allow-Methods");
    responseHeaders.set("Cache-Control", "no-store");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return json({ error: "upstream_unavailable" }, 502);
  }
}
