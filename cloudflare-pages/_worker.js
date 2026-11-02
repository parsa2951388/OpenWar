/**
 * Open War Pages front door.
 *
 * The full game server (HTTP, assets, auth and WebSockets) runs on Render.
 * This Pages advanced-mode worker proxies the same path and request through
 * to that origin, so parsaoj.pages.dev can be used as the public game address.
 */
const ORIGIN = "https://open-war-game.onrender.com";

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(
      incomingUrl.pathname + incomingUrl.search,
      ORIGIN,
    );

    // Constructing from the original Request preserves method, body,
    // headers, cookies, query parameters and WebSocket upgrade metadata.
    const upstreamRequest = new Request(upstreamUrl.toString(), request);
    return fetch(upstreamRequest, { redirect: "manual" });
  },
};
