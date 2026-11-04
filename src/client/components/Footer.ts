import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import version from "resources/version.txt?raw";
import { ClientEnv } from "../ClientEnv";
import { composeGameVersion } from "../GameVersion";

@customElement("page-footer")
export class Footer extends LitElement {
  private desktopVersion: string | null = null;

  protected firstUpdated(): void {
    const bridge = window.openfrontDesktop;
    if (typeof bridge?.version !== "function") return;
    void bridge
      .version()
      .then((value) => {
        this.desktopVersion = value.trim();
        this.requestUpdate();
      })
      .catch(() => {
        // The footer still shows the game build when the shell cannot report
        // its own version.
      });
  }

  createRenderRoot() {
    return this;
  }

  render() {
    let commit = "";
    try {
      commit = ClientEnv.gitCommit();
    } catch {
      // A desktop shell may render the footer before bootstrap config arrives.
    }
    const gameVersion = composeGameVersion(version, commit);
    const shellVersion = this.desktopVersion
      ? ` (Steam ${this.desktopVersion.startsWith("v") ? this.desktopVersion : `v${this.desktopVersion}`})`
      : "";
    const showBuildVersion = window.openfrontDesktop !== undefined;
    const sourceUrl = /^[0-9a-f]{40}$/i.test(commit)
      ? `https://github.com/parsa2951388/OpenWar/tree/${commit}`
      : "https://github.com/parsa2951388/OpenWar";

    return html`
      <footer
        class="[.in-game_&]:hidden bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-2 pt-4 pb-4 px-4 text-white/65 w-full border-t border-white/10 shrink-0 relative z-50"
      >
        <p class="text-xs text-center">
          Open War is an unofficial community fork based on OpenFront. It is not
          affiliated with or endorsed by OpenFront Inc.
        </p>
        <nav
          aria-label="Project and license links"
          class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs"
        >
          <a
            href=${sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-white transition-colors"
            >Source Code</a
          >
          <a
            href="https://github.com/parsa2951388/OpenWar/blob/open-war/independent-self-host/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-white transition-colors"
            >License</a
          >
          <a
            href="/asset-credits.html"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-white transition-colors"
            >Asset Credits</a
          >
          <a
            href="https://github.com/openfrontio/OpenFrontIO"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-white transition-colors"
            >Upstream Project</a
          >
        </nav>
        ${showBuildVersion
          ? html`<p class="footer-version text-xs text-center">${gameVersion}${shellVersion}</p>`
          : null}
        <p class="text-xs text-center">© OpenFront and Contributors</p>
      </footer>
    `;
  }
}
