/**
 * Open War — ArvanCloud Edge entrypoint
 *
 * This is intentionally a thin, fixed-origin reverse proxy:
 * - the Open War web entrypoint is served through Arvan Edge;
 * - fingerprinted Vite/public assets receive immutable cache directives;
 * - live game APIs and WebSocket traffic continue to reach the existing
 *   production origin without changing the existing game backend.
 *
 * Do not turn this into an open proxy. UPSTREAM_ORIGIN must remain a
 * deployment-owned constant.
 */

const UPSTREAM_ORIGIN = "https://open-war-online.onrender.com";
const UPSTREAM = new URL(UPSTREAM_ORIGIN);

const IMMUTABLE_ASSET_PREFIXES = ["/assets/", "/_assets/"];

function isImmutableAsset(pathname) {
  return IMMUTABLE_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-openwar-edge": "arvancloud",
    },
  });
}

async function handleRequest(request) {
  const incomingUrl = new URL(request.url);

  // Local diagnostic endpoint: it does not depend on the Render origin.
  if (incomingUrl.pathname === "/__edge/health") {
    return jsonResponse(200, {
      ok: true,
      service: "open-war-arvan-edge",
      edge: true,
      upstream: UPSTREAM.host,
      timestamp: new Date().toISOString(),
    });
  }

  // Keep the original URL path, query string, method, body, and headers.
  // Only the destination authority is changed. This follows Arvan's
  // documented fetch(url, request) origin-proxy pattern.
  const upstreamUrl = new URL(UPSTREAM_ORIGIN);
  upstreamUrl.pathname = incomingUrl.pathname;
  upstreamUrl.search = incomingUrl.search;

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), request);

    // Return protocol-upgrade responses untouched. Re-wrapping a 101 response
    // would discard the runtime's WebSocket connection object.
    if (
      request.headers.get("upgrade")?.toLowerCase() === "websocket" ||
      upstreamResponse.status === 101
    ) {
      return upstreamResponse;
    }

    const headers = new Headers(upstreamResponse.headers);
    headers.set("x-openwar-edge", "arvancloud");

    // Rewrite same-origin redirects so browser navigation stays on the
    // Arvan-issued hostname. Third-party OAuth/payment redirects are untouched.
    const location = headers.get("location");
    if (location) {
      try {
        const redirectUrl = new URL(location, UPSTREAM_ORIGIN);
        if (redirectUrl.origin === UPSTREAM.origin) {
          redirectUrl.protocol = incomingUrl.protocol;
          redirectUrl.host = incomingUrl.host;
          headers.set("location", redirectUrl.toString());
        }
      } catch {
        // Leave malformed or non-URL Location values unchanged.
      }
    }

    // Only immutable, content-fingerprinted asset namespaces are cacheable.
    // Never cache HTML, authentication, API, match, or WebSocket responses.
    if (
      request.method === "GET" &&
      upstreamResponse.status === 200 &&
      isImmutableAsset(incomingUrl.pathname)
    ) {
      headers.set(
        "cache-control",
        "public, max-age=31536000, s-maxage=31536000, immutable",
      );
      headers.set("x-openwar-edge-cacheable", "immutable-asset");
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch (error) {
    console.error("[open-war-edge] upstream request failed", error);
    return jsonResponse(502, {
      ok: false,
      error: "Open War origin is temporarily unavailable",
      service: "open-war-arvan-edge",
    });
  }
}

// Arvan's documented Edge examples use the FetchEvent entrypoint.
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
