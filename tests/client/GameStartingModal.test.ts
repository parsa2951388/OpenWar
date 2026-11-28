import { afterEach, describe, expect, it } from "vitest";
import { GameStartingModal } from "../../src/client/GameStartingModal";

describe("GameStartingModal", () => {
  let modal: GameStartingModal;

  afterEach(() => {
    modal?.remove();
  });

  it("can be shown again after an earlier failed start hid the host", async () => {
    modal = document.createElement("game-starting-modal") as GameStartingModal;
    document.body.append(modal);
    await modal.updateComplete;

    modal.classList.add("hidden");
    modal.show();
    await modal.updateComplete;

    expect(modal.classList.contains("hidden")).toBe(false);
    expect(modal.isVisible).toBe(true);

    modal.hide();
    await modal.updateComplete;
    expect(modal.isVisible).toBe(false);
  });
});
