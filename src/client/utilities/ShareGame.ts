import { ClientEnv } from "../ClientEnv";
import { gamePortal } from "../GamePortal";
import { copyToClipboard, showToast, translateText } from "../Utils";

/**
 * Copies a multiplayer game URL to the clipboard.
 * Game portals may create their own invite URL; web and desktop builds use the
 * configured share origin so links always point at the public game host.
 */
export async function shareGame(gameId: string | undefined): Promise<void> {
  if (!gameId) {
    showToast(translateText("common.failed_copy"), "red");
    return;
  }

  try {
    const text = gamePortal.isOnGamePortal()
      ? await gamePortal.createInviteLink(gameId)
      : `${ClientEnv.shareOrigin()}${ClientEnv.gamePath(gameId)}`;

    if (!text) {
      showToast(translateText("common.failed_copy"), "red");
      return;
    }

    await copyToClipboard(text);
    showToast(translateText("common.copied"), "green");
  } catch {
    showToast(translateText("common.failed_copy"), "red");
  }
}
