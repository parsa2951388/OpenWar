import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { isOnCrazyGames } = vi.hoisted(() => ({
  isOnCrazyGames: vi.fn(() => false),
}));
vi.mock("../../src/client/CrazyGamesSDK", () => ({
  crazyGamesSDK: {
    isOnCrazyGames,
    getUsername: vi.fn(async () => null),
    getUserProfile: vi.fn(async () => null),
    showAuthPrompt: vi.fn(async () => null),
    addAuthListener: vi.fn(),
  },
}));
vi.mock("@openfront/shared/AssetUrls", () => ({
  assetUrl: (path: string) => path,
}));

// Rendering play-page mounts its children too (steam-wishlist, cosmetic
// background, …), and some reach for browser APIs jsdom doesn't ship.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

import { ClientEnv } from "../../src/client/ClientEnv";
import { PlayPage } from "../../src/client/components/PlayPage";

describe("play-page mobile top bar", () => {
  let el: PlayPage;

  async function mount() {
    // GameModeSelector asks ClientEnv for the default lobby duration as soon
    // as it connects. This test exercises layout, not application bootstrap,
    // so give it the minimal valid environment explicitly.
    (window as any).BOOTSTRAP_CONFIG = {
      gameEnv: "prod",
      numWorkers: 1,
      turnstileSiteKey: "",
      jwtAudience: "openfront.dev",
      instanceId: "test",
      gitCommit: "test",
    };
    ClientEnv.reset();
    if (!customElements.get("play-page")) {
      customElements.define("play-page", PlayPage);
    }
    el = document.createElement("play-page") as PlayPage;
    document.body.appendChild(el);
    await el.updateComplete;
  }

  afterEach(() => {
    el?.remove();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    ClientEnv.reset();
    delete (window as any).BOOTSTRAP_CONFIG;
    isOnCrazyGames.mockReturnValue(false);
  });

  const rightSlot = () =>
    Array.from(el.querySelector(".col-start-3")!.children).map((c) =>
      c.tagName.toLowerCase(),
    );

  describe("off CrazyGames", () => {
    beforeEach(mount);

    it("keeps the header columns bounded and the logo within the mobile rail", () => {
      expect(rightSlot()).toEqual(["nav-utility-icons", "nav-account-menu"]);
      const grid = el.querySelector("#hamburger-btn")?.parentElement;
      expect(grid?.className).toContain("grid-cols-[2.5rem_minmax(0,1fr)_auto]");
      expect(grid?.querySelector("img[alt=\\"Open War\\"]")?.className).toContain(
        "max-w-[min(28vw,9rem)]",
      );
    });
  });

  describe("on CrazyGames", () => {
    beforeEach(async () => {
      isOnCrazyGames.mockReturnValue(true);
      await mount();
    });

    it("renders the same controls — the menu covers their sign-in too", () => {
      // News and Help left the hamburger, so the icons have to be here for
      // CrazyGames players; the profile menu's own "Sign in" item hands off to
      // their SDK prompt, so no platform-specific button is needed.
      expect(rightSlot()).toEqual(["nav-utility-icons", "nav-account-menu"]);
    });
  });
});
