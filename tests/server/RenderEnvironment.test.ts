import { describe, expect, test } from "vitest";
import {
  configureRenderEnvironment,
  DEVELOPMENT_ADMIN_BOT_API_KEY,
  DEVELOPMENT_API_KEY,
  DEVELOPMENT_TURNSTILE_SITE_KEY,
} from "../../src/server/RenderEnvironment";

describe("configureRenderEnvironment", () => {
  test("keeps local development defaults local-only", () => {
    const env: NodeJS.ProcessEnv = {};

    configureRenderEnvironment(env);

    expect(env.GAME_ENV).toBe("dev");
    expect(env.GIT_COMMIT).toBe("OPENWAR");
    expect(env.TURNSTILE_SITE_KEY).toBe(DEVELOPMENT_TURNSTILE_SITE_KEY);
  });

  test("does not overwrite explicitly supplied local values", () => {
    const env: NodeJS.ProcessEnv = {
      GAME_ENV: "dev",
      GIT_COMMIT: "local-sha",
      TURNSTILE_SITE_KEY: "local-site-key",
      API_KEY: "local-api-key",
    };

    configureRenderEnvironment(env);

    expect(env.GIT_COMMIT).toBe("local-sha");
    expect(env.TURNSTILE_SITE_KEY).toBe("local-site-key");
    expect(env.API_KEY).toBe("local-api-key");
  });

  test("requires an explicit game environment on Render", () => {
    expect(() =>
      configureRenderEnvironment({
        RENDER: "true",
        RENDER_GIT_COMMIT: "0123456789abcdef",
      }),
    ).toThrow(/GAME_ENV must be explicitly set on Render/);
  });

  test("refuses insecure dev mode on Render without explicit opt-in", () => {
    expect(() =>
      configureRenderEnvironment({
        RENDER: "true",
        GAME_ENV: "dev",
        RENDER_GIT_COMMIT: "0123456789abcdef",
      }),
    ).toThrow(/Refusing to run GAME_ENV=dev on Render/);
  });

  test("requires explicit opt-in for an isolated Render dev service", () => {
    const env: NodeJS.ProcessEnv = {
      RENDER: "true",
      GAME_ENV: "dev",
      ALLOW_INSECURE_RENDER_DEV: "true",
      RENDER_GIT_COMMIT: "0123456789abcdef",
    };

    configureRenderEnvironment(env);

    expect(env.GIT_COMMIT).toBe("0123456789abcdef");
    expect(env.TURNSTILE_SITE_KEY).toBe(DEVELOPMENT_TURNSTILE_SITE_KEY);
  });

  test("uses Render's deployed commit and preserves configured secrets", () => {
    const env: NodeJS.ProcessEnv = {
      RENDER: "true",
      GAME_ENV: "staging",
      RENDER_GIT_COMMIT: "0123456789abcdef",
      DOMAIN: "example.test",
      API_KEY: "configured-api-key",
      TURNSTILE_SITE_KEY: DEVELOPMENT_TURNSTILE_SITE_KEY,
      NUM_WORKERS: "2",
      INSTANCE_LETTER: "a",
    };

    configureRenderEnvironment(env);

    expect(env.GIT_COMMIT).toBe("0123456789abcdef");
    expect(env.API_KEY).toBe("configured-api-key");
    expect(env.TURNSTILE_SITE_KEY).toBe(DEVELOPMENT_TURNSTILE_SITE_KEY);
  });

  test("rejects the public Turnstile test key in production", () => {
    expect(() =>
      configureRenderEnvironment({
        RENDER: "true",
        GAME_ENV: "prod",
        RENDER_GIT_COMMIT: "0123456789abcdef",
        DOMAIN: "example.test",
        API_KEY: "configured-api-key",
        TURNSTILE_SITE_KEY: DEVELOPMENT_TURNSTILE_SITE_KEY,
        NUM_WORKERS: "2",
        INSTANCE_LETTER: "a",
      }),
    ).toThrow(/live TURNSTILE_SITE_KEY/);
  });

  test("rejects the development API key outside development", () => {
    expect(() =>
      configureRenderEnvironment({
        RENDER: "true",
        GAME_ENV: "staging",
        RENDER_GIT_COMMIT: "0123456789abcdef",
        DOMAIN: "example.test",
        API_KEY: DEVELOPMENT_API_KEY,
        TURNSTILE_SITE_KEY: "staging-site-key",
        NUM_WORKERS: "2",
        INSTANCE_LETTER: "a",
      }),
    ).toThrow(/API_KEY/);
  });

  test("fails without the required production configuration", () => {
    expect(() =>
      configureRenderEnvironment({
        RENDER: "true",
        GAME_ENV: "prod",
        RENDER_GIT_COMMIT: "0123456789abcdef",
      }),
    ).toThrow(/DOMAIN, API_KEY, TURNSTILE_SITE_KEY, NUM_WORKERS, INSTANCE_LETTER/);
  });

  test("removes the optional documented admin-bot placeholder", () => {
    const env: NodeJS.ProcessEnv = {
      GAME_ENV: "dev",
      ADMIN_BOT_API_KEY: DEVELOPMENT_ADMIN_BOT_API_KEY,
    };

    configureRenderEnvironment(env);

    expect(env.ADMIN_BOT_API_KEY).toBeUndefined();
  });

  test("does not print or interpolate secret values in validation errors", () => {
    const secret = "never-print-this-api-key";
    try {
      configureRenderEnvironment({
        RENDER: "true",
        GAME_ENV: "prod",
        RENDER_GIT_COMMIT: "0123456789abcdef",
        API_KEY: secret,
      });
      throw new Error("Expected invalid configuration");
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
