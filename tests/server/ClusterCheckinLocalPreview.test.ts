import { afterEach, describe, expect, it, vi } from "vitest";
import { registerClusterIdentity } from "../../src/server/ClusterCheckin";

describe("local preview cluster registration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("skips upstream registration", async () => {
    vi.stubEnv("OPENWAR_LOCAL_PREVIEW", "true");
    const fetchFn = vi.fn();

    await expect(
      registerClusterIdentity(fetchFn as unknown as typeof fetch, 1),
    ).resolves.toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
