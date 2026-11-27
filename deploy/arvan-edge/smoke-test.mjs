#!/usr/bin/env node

import assert from "node:assert/strict";

const rawBase = process.argv[2];

if (!rawBase) {
  console.error(
    "Usage: node deploy/arvan-edge/smoke-test.mjs https://<app>.<namespace>.arvanedge.ir",
  );
  process.exit(2);
}

let base;
try {
  base = new URL(rawBase);
} catch {
  console.error("The supplied deployment URL is not a valid URL.");
  process.exit(2);
}

assert.equal(base.protocol, "https:", "The Edge URL must use HTTPS.");
base.pathname = "/";
base.search = "";
base.hash = "";

async function check(url, label) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(response.status, 200, label + " returned HTTP " + response.status);
  return response;
}

try {
  const health = await check(new URL("/__edge/health", base), "Edge health");
  const healthBody = await health.json();
  assert.equal(healthBody.ok, true, "Edge health did not report ok=true");
  assert.equal(healthBody.edge, true, "Edge health did not identify Edge runtime");

  const home = await check(base, "Open War homepage");
  const html = await home.text();
  assert.match(html, /Open War/i, "The response does not look like the Open War HTML shell");
  assert.equal(
    home.headers.get("x-openwar-edge"),
    "arvancloud",
    "The homepage did not pass through the Open War Arvan Edge worker",
  );

  const assetMatch = html.match(/(?:src|href)=["']([^"']*\/assets\/[^"']+\.(?:js|css))["']/i);
  if (assetMatch && assetMatch[1]) {
    const assetUrl = new URL(assetMatch[1], base);
    const asset = await check(assetUrl, "Fingerprint asset");
    assert.equal(
      asset.headers.get("x-openwar-edge"),
      "arvancloud",
      "The asset did not pass through the Edge worker",
    );
    console.log("PASS asset: " + assetUrl.pathname);
  } else {
    console.warn("WARN no /assets/*.js or /assets/*.css reference was found in the HTML shell");
  }

  console.log("PASS Edge health endpoint");
  console.log("PASS Open War homepage: " + base.origin);
  console.log("Upstream: " + healthBody.upstream);
  console.log("NOTE: login, multiplayer, WebSocket, and mobile behavior require browser testing.");
} catch (error) {
  console.error("FAIL Arvan Edge smoke test:", error);
  process.exit(1);
}
