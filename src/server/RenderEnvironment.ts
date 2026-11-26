/**
 * Fail-closed runtime configuration for Render.
 *
 * Render's built-in RENDER_GIT_COMMIT is the authoritative deployed revision.
 * Local use keeps the familiar development defaults, but a Render service
 * must opt into an environment explicitly and provide its own credentials.
 */
export const DEVELOPMENT_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
export const DEVELOPMENT_API_KEY =
  "WARNING_DEV_API_KEY_DO_NOT_USE_IN_PRODUCTION";
export const DEVELOPMENT_ADMIN_BOT_API_KEY =
  "WARNING_DEV_ADMIN_BOT_KEY_DO_NOT_USE_IN_PRODUCTION";

function isPublicAudienceDomain(value: string | undefined): boolean {
  if (!value || value.length > 253 || value.toLowerCase() === "localhost") {
    return false;
  }
  const labels = value.split(".");
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
    )
  );
}

export function configureRenderEnvironment(env: NodeJS.ProcessEnv): void {
  const onRender = env.RENDER === "true";

  if (!env.GAME_ENV) {
    if (onRender) {
      throw new Error(
        "GAME_ENV must be explicitly set on Render (dev, staging, or prod)",
      );
    }
    env.GAME_ENV = "dev";
  }

  const gameEnv = env.GAME_ENV;
  if (!["dev", "staging", "prod"].includes(gameEnv)) {
    throw new Error(
      `Unsupported GAME_ENV: ${gameEnv}. Expected dev, staging, or prod.`,
    );
  }

  if (
    onRender &&
    gameEnv === "dev" &&
    env.ALLOW_INSECURE_RENDER_DEV !== "true"
  ) {
    throw new Error(
      "Refusing to run GAME_ENV=dev on Render. Set GAME_ENV=staging or prod; " +
        "use ALLOW_INSECURE_RENDER_DEV=true only for an intentional isolated " +
        "dev service.",
    );
  }

  if (onRender) {
    if (!/^[0-9a-f]{7,40}$/i.test(env.RENDER_GIT_COMMIT ?? "")) {
      throw new Error(
        "Render did not provide a valid RENDER_GIT_COMMIT; refusing to use a stale GIT_COMMIT.",
      );
    }
    // The platform SHA always wins over an explicitly configured/stale value.
    env.GIT_COMMIT = env.RENDER_GIT_COMMIT;
  } else if (gameEnv === "dev") {
    env.GIT_COMMIT ??= "OPENWAR";
  }

  if (!env.GIT_COMMIT) {
    throw new Error(
      "GIT_COMMIT is required; Render normally supplies RENDER_GIT_COMMIT.",
    );
  }

  if (gameEnv === "dev") {
    env.TURNSTILE_SITE_KEY ??= DEVELOPMENT_TURNSTILE_SITE_KEY;

    // The admin-bot key is optional. Never ship the documented warning value.
    if (env.ADMIN_BOT_API_KEY === DEVELOPMENT_ADMIN_BOT_API_KEY) {
      delete env.ADMIN_BOT_API_KEY;
    }
    return;
  }

  const missing: string[] = [];
  if (!isPublicAudienceDomain(env.DOMAIN)) {
    missing.push("public DOMAIN (a DNS domain, not localhost or a URL)");
  }
  if (!env.API_KEY || env.API_KEY === DEVELOPMENT_API_KEY) {
    missing.push("API_KEY");
  }
  if (!env.TURNSTILE_SITE_KEY) missing.push("TURNSTILE_SITE_KEY");

  const workerCount = Number(env.NUM_WORKERS);
  if (
    !env.NUM_WORKERS ||
    !Number.isSafeInteger(workerCount) ||
    workerCount < 1
  ) {
    missing.push("NUM_WORKERS (positive integer)");
  }
  if (!/^[a-z]$/.test(env.INSTANCE_LETTER ?? "")) {
    missing.push("INSTANCE_LETTER (one registered lowercase letter)");
  }

  if (
    gameEnv === "prod" &&
    env.TURNSTILE_SITE_KEY === DEVELOPMENT_TURNSTILE_SITE_KEY
  ) {
    missing.push(
      "live TURNSTILE_SITE_KEY (the configured key is the public test key)",
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Invalid GAME_ENV=${gameEnv} runtime configuration. Missing or unsafe: ` +
        `${missing.join(", ")}. Configure these in the Render Environment ` +
        "settings; no secret values are printed.",
    );
  }

  if (env.ADMIN_BOT_API_KEY === DEVELOPMENT_ADMIN_BOT_API_KEY) {
    delete env.ADMIN_BOT_API_KEY;
  }
}
