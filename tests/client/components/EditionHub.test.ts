import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../src/client/components/EditionHub";

const EDITION_STORAGE_KEY = "openwar.edition";

describe("Open War edition hub", () => {
  let hub: HTMLElement & { updateComplete: Promise<unknown> };

  async function mountHub(): Promise<void> {
    hub = document.createElement("openwar-edition-hub") as typeof hub;
    document.body.appendChild(hub);
    await hub.updateComplete;
  }

  function tabs(): NodeListOf<HTMLButtonElement> {
    return hub.querySelectorAll<HTMLButtonElement>(".ow-edition-tab");
  }

  function classicSelector(): HTMLElement & { start: () => void } {
    return hub.querySelector("game-mode-selector") as HTMLElement & {
      start: () => void;
    };
  }

  beforeEach(() => {
    window.localStorage.removeItem(EDITION_STORAGE_KEY);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    hub?.remove();
    document.body.innerHTML = "";
    window.localStorage.removeItem(EDITION_STORAGE_KEY);
  });

  it("pauses the Classic lobby feed while the coming-soon edition is selected", async () => {
    await mountHub();

    const selector = classicSelector();
    const openLobbyFeed = vi
      .spyOn(selector as any, "openLobbyFeed")
      .mockImplementation(() => {});

    tabs()[1].click();
    await hub.updateComplete;

    expect(hub.querySelector(".ow-classic-edition")?.hasAttribute("hidden")).toBe(
      true,
    );
    expect(
      hub.querySelector(".ow-operations-coming-soon")?.hasAttribute("hidden"),
    ).toBe(false);
    expect(hub.querySelector(".ow-coming-soon-badge")?.textContent).toMatch(
      /under construction|در دست ساخت/i,
    );
    expect(openLobbyFeed).not.toHaveBeenCalled();

    // Main.ts may call start() after a game ends; the online feed remains gated.
    selector.start();
    expect(openLobbyFeed).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(EDITION_STORAGE_KEY)).toBe("operations");
  });

  it("does not expose mission launches or online room entry points in Operations", async () => {
    await mountHub();

    tabs()[1].click();
    await hub.updateComplete;

    expect(hub.querySelectorAll(".ow-mission-launch")).toHaveLength(0);
    expect(hub.querySelectorAll(".ow-operations-footer-actions button")).toHaveLength(
      0,
    );
    expect(hub.querySelectorAll(".ow-coming-soon-card")).toHaveLength(3);
    expect(hub.querySelector(".ow-coming-soon-classic-action")).toBeNull();
    expect(hub.querySelector(".ow-coming-soon-copy .ow-action-primary")).not.toBeNull();
  });

  it("resumes the Classic lobby feed when the player returns to Classic", async () => {
    await mountHub();

    const selector = classicSelector();
    const openLobbyFeed = vi
      .spyOn(selector as any, "openLobbyFeed")
      .mockImplementation(() => {});

    tabs()[1].click();
    await hub.updateComplete;
    expect(openLobbyFeed).not.toHaveBeenCalled();

    tabs()[0].click();
    await hub.updateComplete;

    expect(
      hub.querySelector(".ow-classic-edition")?.hasAttribute("hidden"),
    ).toBe(false);
    expect(openLobbyFeed).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(EDITION_STORAGE_KEY)).toBe("classic");
  });

  it("returns to Classic from the coming-soon screen", async () => {
    await mountHub();

    tabs()[1].click();
    await hub.updateComplete;
    const backButton = hub.querySelector<HTMLButtonElement>(
      ".ow-coming-soon-copy .ow-action-primary",
    );
    expect(backButton).not.toBeNull();

    backButton?.click();
    await hub.updateComplete;

    expect(window.localStorage.getItem(EDITION_STORAGE_KEY)).toBe("classic");
    expect(
      hub.querySelector(".ow-classic-edition")?.hasAttribute("hidden"),
    ).toBe(false);
  });
});
