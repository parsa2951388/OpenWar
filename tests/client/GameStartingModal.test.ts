import { describe, expect, it, vi } from "vitest";
import { GameStartingModal } from "../../src/client/GameStartingModal";

describe("GameStartingModal", () => {
  it("removes the hidden host state when shown again", () => {
    const element = document.createElement("div");
    element.classList.add("hidden");
    const modal = {
      classList: element.classList,
      isVisible: false,
      requestUpdate: vi.fn(),
    };

    GameStartingModal.prototype.show.call(modal as unknown as GameStartingModal);

    expect(element.classList.contains("hidden")).toBe(false);
    expect(modal.isVisible).toBe(true);
    expect(modal.requestUpdate).toHaveBeenCalledOnce();
  });
});
