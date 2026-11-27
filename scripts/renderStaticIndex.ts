import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

async function main(): Promise<void> {
  if (process.env.OPENWAR_STATIC_SITE !== "true") {
    return;
  }

  // The static site has no Node runtime to execute EJS placeholders. Render
  // the same environment-only bootstrap used by the server, but leave all
  // per-server routing fields absent so clients use the API server registry.
  process.env.GAME_ENV = "prod";
  process.env.DOMAIN = nonEmpty(process.env.DOMAIN) ?? "openfront.io";
  process.env.API_ORIGIN =
    nonEmpty(process.env.API_ORIGIN) ??
    "https://openwar-api-gateway.parsaoj.workers.dev";
  process.env.CDN_BASE =
    process.env.GITHUB_PAGES === "true" ? "/OpenWar" : "";
  process.env.GIT_COMMIT =
    nonEmpty(process.env.RENDER_GIT_COMMIT) ??
    nonEmpty(process.env.GIT_COMMIT) ??
    "OPENWAR";

  if (!nonEmpty(process.env.TURNSTILE_SITE_KEY)) {
    throw new Error(
      "OPENWAR_STATIC_SITE requires a production TURNSTILE_SITE_KEY; refusing to publish an unusable client.",
    );
  }

  const indexPath = path.resolve("static/index.html");
  const source = await readFile(indexPath, "utf8");
  const { renderHtmlContent } = await import("../src/server/RenderHtml");
  const rendered = await renderHtmlContent(indexPath, { perServer: false });

  if (/<%[-=]?/.test(rendered)) {
    throw new Error(
      "Static index still contains unrendered EJS template tags.",
    );
  }
  if (!rendered.includes("window.BOOTSTRAP_CONFIG")) {
    throw new Error("Static index is missing BOOTSTRAP_CONFIG.");
  }
  if (source.length === 0 || rendered.length === 0) {
    throw new Error("Static index render produced an empty document.");
  }

  await writeFile(indexPath, rendered, "utf8");
  console.log("Rendered Open War static index with production bootstrap.");
}

main().catch((error: unknown) => {
  console.error("Failed to render the Open War static index:", error);
  process.exitCode = 1;
});
