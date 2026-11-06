import { assetUrl } from "@openfront/shared/AssetUrls";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import "./NavAccountMenu";
import { NavNotificationsController } from "./NavNotificationsController";
import "./NavUtilityIcons";

@customElement("desktop-nav-bar")
export class DesktopNavBar extends LitElement {
  private _notifications = new NavNotificationsController(this);

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("showPage", this._onShowPage);
    const current = window.currentPageId;
    if (current)
      void this.updateComplete.then(() => this._updateActiveState(current));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("showPage", this._onShowPage);
  }

  private _onShowPage = (e: Event) =>
    this._updateActiveState((e as CustomEvent).detail);

  private _updateActiveState(pageId: string) {
    this.querySelectorAll(".nav-menu-item").forEach((el) => {
      el.classList.toggle(
        "active",
        (el as HTMLElement).dataset.page === pageId,
      );
    });
  }

  render() {
    window.currentPageId ??= "page-play";
    const currentPage = window.currentPageId;
    return html`
      <nav
        class="hidden lg:flex w-full bg-zinc-950/95 border-b border-white/10 backdrop-blur-xl items-center justify-center gap-5 xl:gap-7 px-4 py-3 shrink-0 z-50 relative compact:[zoom:0.75]"
      >
        <div class="flex flex-col items-center justify-center">
          <div class="h-8">
            <img
              class="block h-full aspect-[1364/259]"
              src=${assetUrl("images/OpenWarLogo.svg")}
              alt="Open War"
            />
          </div>
          <div
            id="game-version"
            class="l-header__highlightText text-center"
          ></div>
        </div>
        <button
          class="nav-menu-item ${currentPage === "page-play" ? "active" : ""} text-white/70 hover:text-malibu-blue font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-malibu-blue"
          data-page="page-play"
          data-i18n="main.play"
        ></button>
        <button
          class="nav-menu-item ${currentPage === "page-news" ? "active" : ""} text-white/70 hover:text-malibu-blue font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-malibu-blue"
          data-page="page-news"
          data-i18n="main.news"
        ></button>
        <div class="relative no-game-portal">
          <button
            class="nav-menu-item ${currentPage === "page-item-store" ? "active" : ""} text-white/70 hover:text-malibu-blue font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-malibu-blue"
            data-page="page-item-store"
            data-i18n="main.store"
            @click=${this._notifications.onStoreClick}
          ></button>
          ${this._notifications.showStoreDot() ? html`<span class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span><span class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>` : ""}
        </div>
        <button
          class="nav-menu-item ${currentPage === "page-inventory" ? "active" : ""} text-white/70 hover:text-malibu-blue font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-malibu-blue"
          data-page="page-inventory"
          data-i18n="main.inventory"
        ></button>
        <button
          class="nav-menu-item text-white/70 hover:text-malibu-blue font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-malibu-blue"
          data-page="page-leaderboard"
          data-i18n="main.leaderboard"
        ></button>
        <button
          class="no-game-portal nav-menu-item text-white/70 hover:text-blue-500 font-medium tracking-wider uppercase cursor-pointer transition-colors [&.active]:text-blue-500"
          data-page="page-clan"
          data-i18n="main.clans"
        ></button>
        <div class="flex items-center gap-1 pl-5 ml-1 border-l border-white/10">
          <nav-utility-icons size="desktop"></nav-utility-icons>
          <nav-account-menu variant="desktop"></nav-account-menu>
        </div>
      </nav>
    `;
  }
}
