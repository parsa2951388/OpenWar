import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  beforeEach(() => {
    window.localStorage.removeItem(EDITION_STORAGE_KEY);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    hub?.remove();
    document.body.innerHTML = "";
    window.localStorage.removeItem(EDITION_STORAGE_KEY);
  });

  it("unmounts Classic lobby feed in Operations mode", async () => {
    await mountHub();

    expect(hub.querySelector("game-mode-selector")).not.toBeNull();
    tabs()[1].click();
    await hub.updateComplete;

    expect(hub.querySelector("game-mode-selector")).toBeNull();
    expect(hub.querySelector(".ow-classic-edition")).toBeNull();
    const operationsDashboard = hub.querySelector(".ow-operations-dashboard");
    expect(operationsDashboard?.hasAttribute("hidden")).toBe(false);
    expect(window.localStorage.getItem(EDITION_STORAGE_KEY)).toBe("operations");
  });

  it("remounts Classic lobby feed when returning to Classic", async () => {
    await mountHub();

    tabs()[1].click();
    await hub.updateComplete;
    expect(hub.querySelector("game-mode-selector")).toBeNull();

    tabs()[0].click();
    await hub.updateComplete;

    expect(hub.querySelector("game-mode-selector")).not.toBeNull();
    expect(window.localStorage.getItem(EDITION_STORAGE_KEY)).toBe("classic");
  });
});
