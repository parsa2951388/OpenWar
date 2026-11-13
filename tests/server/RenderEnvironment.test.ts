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

  test("always uses Render's current deployed commit over a stale value", () => {
    const env: NodeJS.ProcessEnv = {
      RENDER: "true",
      GAME_ENV: "dev",
      ALLOW_INSECURE_RENDER_DEV: "true",
      RENDER_GIT_COMMIT: "0123456789abcdef",
      GIT_COMMIT: "OPENWAR",
    };

    configureRenderEnvironment(env);

    expect(env.GIT_COMMIT).toBe("0123456789abcdef");
  });

  test("rejects a missing or malformed Render commit even when GIT_COMMIT exists", () => {
    expect(() =>
      configureRenderEnvironment({
        RENDER: "true",
        GAME_ENV: "dev",
        ALLOW_INSECURE_RENDER_DEV: "true",
        GIT_COMMIT: "OPENWAR",
      }),
    ).toThrow(/valid RENDER_GIT_COMMIT/);
  });

  test("uses Render's deployed commit and preserves configured secrets", () => {
    const env: NodeJS.ProcessEnv = {
      RENDER: "true",
      GAME_ENV: "staging",
      RENDER_GIT_COMMIT: "0123456789abcdef",
      GIT_COMMIT: "OPENWAR",
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

  test("rejects localhost as a deployed API audience domain", () => {
    expect(() =>
      configureRenderEnvironment({
        RENDER: "true",
        GAME_ENV: "staging",
        RENDER_GIT_COMMIT: "0123456789abcdef",
        DOMAIN: "localhost",
        API_KEY: "configured-api-key",
        TURNSTILE_SITE_KEY: "staging-site-key",
        NUM_WORKERS: "2",
        INSTANCE_LETTER: "a",
      }),
    ).toThrow(/public DOMAIN/);
  });

  test("allows the launcher to register the Render identity before importing the server", () => {
    const env: NodeJS.ProcessEnv = {
      RENDER: "true",
      GAME_ENV: "prod",
      RENDER_GIT_COMMIT: "0123456789abcdef0123456789abcdef01234567",
      RENDER_EXTERNAL_HOSTNAME: "open-war-online.onrender.com",
      DOMAIN: "openfront.io",
      API_KEY: "configured-api-key",
      TURNSTILE_SITE_KEY: "live-turnstile-site-key",
    };

    expect(() => configureRenderEnvironment(env)).not.toThrow();
    expect(env.INSTANCE_LETTER).toBeUndefined();
    expect(env.NUM_WORKERS).toBeUndefined();
  });

  test("requires the API registry identity to be configured as a pair", () => {
    expect(() =>
      configureRenderEnvironment({
        RENDER: "true",
        GAME_ENV: "staging",
        RENDER_GIT_COMMIT: "0123456789abcdef0123456789abcdef01234567",
        RENDER_EXTERNAL_HOSTNAME: "open-war-online.onrender.com",
        DOMAIN: "openfront.io",
        API_KEY: "configured-api-key",
        TURNSTILE_SITE_KEY: "staging-site-key",
        INSTANCE_LETTER: "a",
      }),
    ).toThrow(/INSTANCE_LETTER and NUM_WORKERS must be configured together/);
  });

  test("rejects malformed worker counts and unregistered instance letters", () => {
    expect(() =>
      configureRenderEnvironment({
        RENDER: "true",
        GAME_ENV: "staging",
        RENDER_GIT_COMMIT: "0123456789abcdef",
        DOMAIN: "example.test",
        API_KEY: "configured-api-key",
        TURNSTILE_SITE_KEY: "staging-site-key",
        NUM_WORKERS: "0",
        INSTANCE_LETTER: "AB",
      }),
    ).toThrow(/NUM_WORKERS.*INSTANCE_LETTER/);
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
    ).toThrow(
      /public DOMAIN.*API_KEY.*TURNSTILE_SITE_KEY.*RENDER_EXTERNAL_HOSTNAME/,
    );
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
