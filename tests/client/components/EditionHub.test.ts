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

  it("renders all six mission cards when Operations is selected", async () => {
    await mountHub();

    const dashboard = hub.querySelector(".ow-operations-dashboard");
    expect(dashboard?.hasAttribute("hidden")).toBe(true);

    tabs()[1].click();
    await hub.updateComplete;

    expect(dashboard?.hasAttribute("hidden")).toBe(false);
    const cards = hub.querySelectorAll<HTMLElement>(".ow-mission-card");
    expect(cards).toHaveLength(6);
    expect(cards[0].querySelector(".ow-mission-number")?.textContent).toContain(
      "01",
    );
    expect(cards[5].querySelector(".ow-mission-number")?.textContent).toContain(
      "06",
    );
    expect(
      cards[0].querySelector<HTMLButtonElement>(".ow-mission-launch")?.disabled,
    ).toBe(false);
    expect(
      cards[3].querySelector<HTMLButtonElement>(".ow-mission-launch")?.disabled,
    ).toBe(true);
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

  it("filters missions by their real unlock and completion state", async () => {
    await mountHub();

    const locked = hub.querySelector<HTMLButtonElement>(
      '[data-mission-filter="locked"]',
    );
    expect(locked).not.toBeNull();
    locked!.click();
    await hub.updateComplete;
    expect(hub.querySelectorAll(".ow-mission-card")).toHaveLength(3);
    expect(
      [...hub.querySelectorAll(".ow-mission-card")].every((card) =>
        card.classList.contains("is-locked"),
      ),
    ).toBe(true);

    hub
      .querySelector<HTMLButtonElement>('[data-mission-filter="ready"]')!
      .click();
    await hub.updateComplete;
    expect(hub.querySelectorAll(".ow-mission-card")).toHaveLength(3);
    expect(
      [...hub.querySelectorAll(".ow-mission-card")].every(
        (card) => !card.classList.contains("is-locked"),
      ),
    ).toBe(true);
  });

  it("shows a useful empty state when a filter has no completed missions", async () => {
    await mountHub();
    hub
      .querySelector<HTMLButtonElement>('[data-mission-filter="cleared"]')!
      .click();
    await hub.updateComplete;

    expect(hub.querySelectorAll(".ow-mission-card")).toHaveLength(0);
    const emptyState = hub.querySelector<HTMLElement>(
      '[data-testid="mission-filter-empty"]',
    );
    expect(emptyState?.getAttribute("role")).toBe("status");
    expect(emptyState?.textContent?.trim()).toBeTruthy();
  });

  it("exposes accessible campaign completion progress", async () => {
    await mountHub();
    const progress = hub.querySelector<HTMLElement>(
      '[data-testid="campaign-progress"]',
    );
    expect(progress?.getAttribute("role")).toBe("progressbar");
    expect(progress?.getAttribute("aria-valuenow")).toBe("0");

    setCampaignWins(1);
    await hub.updateComplete;

    expect(
      hub
        .querySelector('[data-testid="campaign-progress"]')
        ?.getAttribute("aria-valuenow"),
    ).toBe("17");
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
