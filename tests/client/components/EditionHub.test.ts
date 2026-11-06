import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../src/client/components/EditionHub";

const EDITION_STORAGE_KEY = "openwar.edition";
const CAMPAIGN_STORAGE_KEY = "openwar.operations.campaign.v1";

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

  function setCampaignWins(wins: number): void {
    window.localStorage.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        missions: {
          "iron-gate": {
            attempts: wins,
            wins,
            bestStars: 3,
            bestTimeSeconds: 300,
            lastPlayedAt: 1,
          },
        },
      }),
    );
    window.dispatchEvent(new CustomEvent("operations-campaign-updated"));
  }

  beforeEach(() => {
    window.localStorage.removeItem(EDITION_STORAGE_KEY);
    window.localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    hub?.remove();
    document.body.innerHTML = "";
    window.localStorage.removeItem(EDITION_STORAGE_KEY);
    window.localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
  });

  it("pauses the Classic lobby feed while Operations is selected", async () => {
    await mountHub();

    const selector = classicSelector();
    expect(hub.querySelectorAll(".ow-classic-system-card")).toHaveLength(4);
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

  it("shows an under-construction preview instead of Operations missions on public hosts", async () => {
    await mountHub();

    tabs()[1].click();
    await hub.updateComplete;

    expect(hub.querySelector(".ow-operations-dashboard")).toBeNull();
    expect(hub.querySelectorAll(".ow-mission-card")).toHaveLength(0);

    const onlinePanel = hub.querySelector(".ow-online-operations");
    expect(onlinePanel).not.toBeNull();
    expect(
      onlinePanel
        ?.querySelector(".ow-online-operations-note")
        ?.textContent?.trim(),
    ).toBeTruthy();
  });

  it("blocks every Operations online entry point and explains why", async () => {
    await mountHub();

    tabs()[1].click();
    await hub.updateComplete;

    const onlinePanel = hub.querySelector(".ow-online-operations");
    expect(onlinePanel).not.toBeNull();
    expect(
      onlinePanel
        ?.querySelector(".ow-online-operations-badge")
        ?.textContent?.trim(),
    ).not.toBe("");

    const onlineButtons = Array.from(
      onlinePanel?.querySelectorAll<HTMLButtonElement>(
        ".ow-online-disabled-actions button",
      ) ?? [],
    );
    expect(onlineButtons).toHaveLength(3);
    const joined = vi.fn();
    document.addEventListener("join-lobby", joined);
    try {
      for (const button of onlineButtons) {
        expect(button.disabled).toBe(false);
        button.click();
        await hub.updateComplete;
        expect(
          hub
            .querySelector('[data-testid="online-operations-note"]')
            ?.textContent?.trim(),
        ).toBeTruthy();
      }
      expect(joined).not.toHaveBeenCalled();
      expect(
        hub.querySelector('[data-testid="online-operations-note"]')
          ?.textContent,
      ).not.toBe("");
    } finally {
      document.removeEventListener("join-lobby", joined);
    }

    // Public hosts do not render the local-only Operations campaign.
    expect(hub.querySelector(".ow-operations-dashboard")).toBeNull();
    expect(hub.querySelectorAll(".ow-mission-launch")).toHaveLength(0);
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

    const cards = hub.querySelectorAll<HTMLElement>(".ow-mission-card");
    setCampaignWins(1);
    await hub.updateComplete;
    const northernUnlock = cards[4].querySelector(".ow-mission-unlock");
    expect(northernUnlock?.textContent).toContain("1");

    setCampaignWins(2);
    await hub.updateComplete;
    const pacificUnlock = cards[5].querySelector(".ow-mission-unlock");
    expect(pacificUnlock?.textContent).toContain("1");
  });
});
