import { afterEach, describe, expect, it, vi } from "vitest";
import { initNavigation } from "../../src/client/Navigation";

const editionKey = "openwar.edition";

describe("Operations online route gate", () => {
  afterEach(() => {
    window.localStorage.removeItem(editionKey);
    document.body.replaceChildren();
    window.showPage = undefined;
  });

  it("returns direct online-server navigation to Operations and shows the lock notice", () => {
    document.body.innerHTML = `<div id="page-play"></div><div id="page-detailed-view" class="page-content hidden"></div>`;
    const hub = document.createElement("openwar-edition-hub") as HTMLElement & {
      showOnlineUnderConstruction: () => void;
    };
    hub.showOnlineUnderConstruction = vi.fn();
    document.getElementById("page-play")!.appendChild(hub);
    window.localStorage.setItem(editionKey, "operations");

    initNavigation();
    window.showPage?.("page-detailed-view");

    expect(
      document.getElementById("page-play")?.classList.contains("hidden"),
    ).toBe(false);
    expect(
      document
        .getElementById("page-detailed-view")
        ?.classList.contains("hidden"),
    ).toBe(true);
    expect(hub.showOnlineUnderConstruction).toHaveBeenCalledOnce();
  });
});
