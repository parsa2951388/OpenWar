import { afterEach, describe, expect, it, vi } from "vitest";
import { GameMapType } from "@openfront/engine-api/game/GameTypes";
import { FetchGameMapLoader } from "@openfront/shared/FetchGameMapLoader";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("FetchGameMapLoader request bounds", () => {
  it("aborts a stalled map request and reports a useful timeout", async () => {
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation(() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 0);
        return controller.signal;
      });
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const loader = new FetchGameMapLoader("https://assets.example/maps");
    const manifest = loader.getMapData(GameMapType.Africa).manifest();

    await expect(manifest).rejects.toThrow("Timed out loading game asset");
    expect(timeoutSpy).toHaveBeenCalledWith(45_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
