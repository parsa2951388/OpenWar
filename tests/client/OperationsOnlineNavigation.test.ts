import { afterEach, describe, expect, it, vi } from "vitest";
import { initNavigation } from "../../src/client/Navigation";
import {
  isOperationsEditionSelected,
  setOpenWarEditionPreference,
} from "../../src/client/components/EditionPreference";

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

  it("keeps the New online gate active when browser storage is blocked", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage blocked");
      });

    setOpenWarEditionPreference("operations");
    expect(isOperationsEditionSelected()).toBe(true);

    setItem.mockRestore();
    setOpenWarEditionPreference("classic");
  });
});
