import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("font atlas preload", () => {
  it("can retry after an initial fetch failure", async () => {
    vi.resetModules();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            info: { size: 32 },
            common: { base: 24, scaleW: 1, scaleH: 1 },
            chars: [],
            kernings: [],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { preloadAtlasData } =
      await import("../../../../src/client/render/gl/passes/name-pass/AtlasData");

    await expect(preloadAtlasData()).rejects.toThrow(
      "temporary network failure",
    );
    await expect(preloadAtlasData()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
