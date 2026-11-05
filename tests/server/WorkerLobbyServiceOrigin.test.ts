import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DESKTOP_APP_ORIGIN,
  isAllowedWebSocketOrigin,
} from "../../src/server/GameApiCors";

describe("isAllowedWebSocketOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows same-origin browser sockets", () => {
    expect(
      isAllowedWebSocketOrigin(
        "https://open-war-game.onrender.com",
        "open-war-game.onrender.com",
      ),
    ).toBe(true);
  });

  it("allows the configured desktop origin and exact auth origin", () => {
    vi.stubEnv("AUTH_ORIGIN", "https://open-war-8o2.pages.dev");
    expect(isAllowedWebSocketOrigin(DESKTOP_APP_ORIGIN, undefined)).toBe(true);
    expect(
      isAllowedWebSocketOrigin("https://open-war-8o2.pages.dev", undefined),
    ).toBe(true);
  });

  it("rejects cross-origin websites that are not on the allowlist", () => {
    expect(
      isAllowedWebSocketOrigin(
        "https://evil.example",
        "open-war-game.onrender.com",
      ),
    ).toBe(false);
  });

  it("allows non-browser clients which do not send an Origin header", () => {
    expect(
      isAllowedWebSocketOrigin(undefined, "open-war-game.onrender.com"),
    ).toBe(true);
  });

  it("rejects malformed or non-origin Origin header values", () => {
    expect(
      isAllowedWebSocketOrigin(
        "https://open-war-game.onrender.com/path",
        "open-war-game.onrender.com",
      ),
    ).toBe(false);
    expect(isAllowedWebSocketOrigin("null", "open-war-game.onrender.com")).toBe(
      false,
    );
  });
});
