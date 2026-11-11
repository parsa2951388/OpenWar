/**
 * Fail-closed runtime configuration for Render.
 *
 * Render's built-in RENDER_GIT_COMMIT is the authoritative deployed revision.
 * Local use keeps the familiar development defaults, but a Render service
 * must opt into an environment explicitly and provide its own credentials.
 */
export const DEVELOPMENT_TURNSTILE_SITE_KEY =
  "1x00000000000000000000AA";
export const DEVELOPMENT_API_KEY =
  "WARNING_DEV_API_KEY_DO_NOT_USE_IN_PRODUCTION";
export const DEVELOPMENT_ADMIN_BOT_API_KEY =
  "WARNING_DEV_ADMIN_BOT_KEY_DO_NOT_USE_IN_PRODUCTION";

export function configureRenderEnvironment(
  env: NodeJS.ProcessEnv,
): void {
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
        "use ALLOW_INSECURE_RENDER_DEV=true only for an intentional isolated dev service.",
    );
  }

  if (!env.GIT_COMMIT) {
    if (onRender && env.RENDER_GIT_COMMIT) {
      env.GIT_COMMIT = env.RENDER_GIT_COMMIT;
    } else if (!onRender && gameEnv === "dev") {
      env.GIT_COMMIT = "OPENWAR";
    }
  }

  if (!env.GIT_COMMIT) {
    throw new Error(
      "GIT_COMMIT is required; Render normally supplies RENDER_GIT_COMMIT.",
    );
  }

  if (gameEnv === "dev") {
    if (!env.TURNSTILE_SITE_KEY) {
      env.TURNSTILE_SITE_KEY = DEVELOPMENT_TURNSTILE_SITE_KEY;
    }
    // The admin-bot key is optional. Never ship the documented warning value.
    if (env.ADMIN_BOT_API_KEY === DEVELOPMENT_ADMIN_BOT_API_KEY) {
      delete env.ADMIN_BOT_API_KEY;
    }
    return;
  }

  const missing: string[] = [];
  if (!env.DOMAIN) missing.push("DOMAIN");
  if (!env.API_KEY || env.API_KEY === DEVELOPMENT_API_KEY) {
    missing.push("API_KEY");
  }
  if (!env.TURNSTILE_SITE_KEY) missing.push("TURNSTILE_SITE_KEY");
  if (!env.NUM_WORKERS) missing.push("NUM_WORKERS");
  if (!env.INSTANCE_LETTER) missing.push("INSTANCE_LETTER");
  if (gameEnv === "prod" && env.TURNSTILE_SITE_KEY === DEVELOPMENT_TURNSTILE_SITE_KEY) {
    missing.push("live TURNSTILE_SITE_KEY (the configured key is the public test key)");
  }

  if (missing.length > 0) {
    throw new Error(
      `Invalid GAME_ENV=${gameEnv} runtime configuration. Missing or unsafe: ${missing.join(", ")}. Configure these in the Render Environment settings; no secret values are printed.`,
    );
  }

  if (env.ADMIN_BOT_API_KEY === DEVELOPMENT_ADMIN_BOT_API_KEY) {
    delete env.ADMIN_BOT_API_KEY;
  }
}
