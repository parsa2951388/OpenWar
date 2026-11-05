import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../src/client/components/EditionHub";
import {
  OPERATIONS_CAMPAIGN_STORAGE_KEY,
  recordOperationsMissionResult,
} from "../../../src/client/components/OperationsCampaign";

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
    window.localStorage.removeItem(OPERATIONS_CAMPAIGN_STORAGE_KEY);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    hub?.remove();
    document.body.innerHTML = "";
    window.localStorage.removeItem(EDITION_STORAGE_KEY);
    window.localStorage.removeItem(OPERATIONS_CAMPAIGN_STORAGE_KEY);
  });

  it("pauses the Classic lobby feed while Operations is selected", async () => {
    await mountHub();

    const selector = classicSelector();
    const openLobbyFeed = vi
      .spyOn(selector as any, "openLobbyFeed")
      .mockImplementation(() => {});

    tabs()[1].click();
    await hub.updateComplete;

    expect(hub.querySelector("game-mode-selector")).not.toBeNull();
    expect(
      hub.querySelector(".ow-classic-edition")?.hasAttribute("hidden"),
    ).toBe(true);
    expect(openLobbyFeed).not.toHaveBeenCalled();

    // Main.ts calls start() when a game ends; it must stay gated in Operations.
    selector.start();
    expect(openLobbyFeed).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(EDITION_STORAGE_KEY)).toBe("operations");
  });

  it("resumes the Classic lobby feed on returning to Classic", async () => {
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

  it("shows remaining victories needed to unlock each mission", async () => {
    await mountHub();

    recordOperationsMissionResult("iron-gate", true, 300);
    await hub.updateComplete;
    const northernBastion = hub.querySelectorAll<HTMLElement>(
      ".ow-mission-card",
    )[4];
    expect(
      northernBastion.querySelector(".ow-mission-unlock")?.textContent,
    ).toContain("1");

    recordOperationsMissionResult("tidebreaker", true, 300);
    await hub.updateComplete;
    const pacificAscendant = hub.querySelectorAll<HTMLElement>(
      ".ow-mission-card",
    )[5];
    expect(
      pacificAscendant.querySelector(".ow-mission-unlock")?.textContent,
    ).toContain("1");
  });
});
