import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/client/ClientEnv", () => ({
  // Older injected environments and isolated test adapters expose the
  // audience but do not implement the optional API transport override.
  ClientEnv: { jwtAudience: () => "localhost" },
}));

import { getApiBase } from "../../src/client/ApiBase";

describe("getApiBase legacy environment fallback", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses API_DOMAIN when apiOrigin is not exposed by the environment adapter", () => {
    vi.stubEnv("API_DOMAIN", "api.test");

    expect(getApiBase()).toBe("https://api.test");
  });
});
