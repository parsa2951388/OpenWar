import { spawnSync } from "child_process";
import fs from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import { afterEach, describe, expect, test } from "vitest";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const packageJson = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { scripts: Record<string, string> };

const tempDirectories: string[] = [];

function runRenderStart(
  overrides: Partial<
    Record<
      "GAME_ENV" | "TURNSTILE_SITE_KEY" | "GIT_COMMIT" | "RENDER_GIT_COMMIT",
      string
    >
  > = {},
) {
  const tempDirectory = fs.mkdtempSync(
    path.join(tmpdir(), "openwar-render-start-"),
  );
  tempDirectories.push(tempDirectory);

  const fakeTsx = path.join(tempDirectory, "tsx");
  fs.writeFileSync(
    fakeTsx,
    '#!/bin/sh\nprintf "%s|%s|%s\\n" "$GAME_ENV" "${TURNSTILE_SITE_KEY:-}" "${GIT_COMMIT:-}"\n',
  );
  fs.chmodSync(fakeTsx, 0o755);

  const env = {
    ...process.env,
    PATH: `${tempDirectory}:${process.env.PATH ?? ""}`,
    RENDER: "true",
    GAME_ENV: overrides.GAME_ENV ?? "",
    TURNSTILE_SITE_KEY: overrides.TURNSTILE_SITE_KEY ?? "",
    GIT_COMMIT: overrides.GIT_COMMIT ?? "",
    RENDER_GIT_COMMIT: overrides.RENDER_GIT_COMMIT ?? "",
  };

  return spawnSync("sh", ["-c", packageJson.scripts["start:render"]], {
    cwd: repositoryRoot,
    env,
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("Render start command", () => {
  test("defaults to production and preserves the real Turnstile key", () => {
    const result = runRenderStart({
      TURNSTILE_SITE_KEY: "production-site-key",
      RENDER_GIT_COMMIT: "release-commit",
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(
      "prod|production-site-key|release-commit",
    );
  });

  test(
    "fails closed instead of using a development Turnstile key in production",
    () => {
      const result = runRenderStart();

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("TURNSTILE_SITE_KEY");
    },
  );

  test("keeps the explicit local development mode available", () => {
    const result = runRenderStart({ GAME_ENV: "dev" });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(
      "dev|1x00000000000000000000AA|OPENWAR",
    );
  });
});
