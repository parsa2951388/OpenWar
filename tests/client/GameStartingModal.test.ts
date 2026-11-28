import { describe, expect, it, vi } from "vitest";
import { GameStartingModal } from "../../src/client/GameStartingModal";

describe("GameStartingModal", () => {
  it("removes a stale hidden host class when the modal is shown again", () => {
    const remove = vi.fn();
    const requestUpdate = vi.fn();
    const modal = {
      classList: { remove },
      isVisible: false,
      requestUpdate,
    } as unknown as GameStartingModal;

    GameStartingModal.prototype.show.call(modal);

    expect(remove).toHaveBeenCalledWith("hidden");
    expect(modal.isVisible).toBe(true);
    expect(requestUpdate).toHaveBeenCalledOnce();
  });

  it("hides the modal state", () => {
    const requestUpdate = vi.fn();
    const modal = {
      isVisible: true,
      requestUpdate,
    } as unknown as GameStartingModal;

    GameStartingModal.prototype.hide.call(modal);

    expect(modal.isVisible).toBe(false);
    expect(requestUpdate).toHaveBeenCalledOnce();
  });
});
