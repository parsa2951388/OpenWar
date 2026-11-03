import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import "../GameModeSelector";
import { whenModalLoaded } from "../LazyModals";
import type { HostLobbyModal } from "../HostLobbyModal";
import type { JoinLobbyModal } from "../JoinLobbyModal";
import type { SinglePlayerModal } from "../SinglePlayerModal";
import { UsernameInput } from "../UsernameInput";
import { translateText } from "../Utils";
import { normalizeOpenWarEdition, type OpenWarEdition } from "./EditionPreference";
import "./EditionHub.css";

const EDITION_STORAGE_KEY = "openwar.edition";

function readEditionPreference(): OpenWarEdition {
  try {
    return normalizeOpenWarEdition(window.localStorage.getItem(EDITION_STORAGE_KEY));
  } catch {
    return "classic";
  }
}

@customElement("openwar-edition-hub")
export class EditionHub extends LitElement {
  @state() private edition: OpenWarEdition = readEditionPreference();

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("language-changed", this.onLanguageChanged);
  }

  disconnectedCallback() {
    document.removeEventListener("language-changed", this.onLanguageChanged);
    super.disconnectedCallback();
  }

  private onLanguageChanged = () => {
    this.requestUpdate();
  };

  private t(key: string): string {
    return translateText(`edition_hub.${key}`);
  }

  private selectEdition = (edition: OpenWarEdition) => {
    if (this.edition === edition) return;
    this.edition = edition;
    try {
      window.localStorage.setItem(EDITION_STORAGE_KEY, edition);
    } catch {
      // The selector still works for this page load when browser storage is unavailable.
    }
    this.dispatchEvent(
      new CustomEvent("openwar-edition-changed", {
        detail: { edition },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private validateUsername(): boolean {
    const input = document.querySelector("username-input") as UsernameInput | null;
    return input ? input.canPlay() : true;
  }

  private openTraining = () => {
    if (!this.validateUsername()) return;
    whenModalLoaded("single-player-modal", () => {
      (document.querySelector("single-player-modal") as SinglePlayerModal | null)?.open();
    });
  };

  private openPublicBattles = () => {
    if (!this.validateUsername()) return;
    window.showPage?.("page-detailed-view");
  };

  private openPrivateRoom = () => {
    if (!this.validateUsername()) return;
    whenModalLoaded("host-lobby-modal", () => {
      (document.querySelector("host-lobby-modal") as HostLobbyModal | null)?.open();
    });
  };

  private joinRoom = () => {
    if (!this.validateUsername()) return;
    whenModalLoaded("join-lobby-modal", () => {
      (document.querySelector("join-lobby-modal") as JoinLobbyModal | null)?.open();
    });
  };

  private renderEditionControl() {
    return html`
      <section class="ow-edition-header" aria-label=${this.t("choose_experience")}>
        <div class="ow-edition-heading">
          <span class="ow-edition-eyebrow">${this.t("top_eyebrow")}</span>
          <h1>${this.t("intro_title")}</h1>
          <p>${this.copy(
            "تجربهٔ کلاسیک را برای نبرد سریع انتخاب کن یا وارد میز عملیات و مسیر توسعهٔ جدید شو.",
            "Choose the familiar classic battlefield or explore the new Operations command experience.",
          )}</p>
        </div>
        <div class="ow-edition-switch" role="group" aria-label=${this.t("edition_switch_label")}>
          <button
            type="button"
            class="ow-edition-tab ${this.edition === "classic" ? "is-active" : ""}"
            aria-pressed=${this.edition === "classic" ? "true" : "false"}
            @click=${() => this.selectEdition("classic")}
          >
            <span class="ow-edition-tab-mark ow-edition-tab-mark-classic" aria-hidden="true"></span>
            <span>${this.t("classic_title")}</span>
            <small>${this.t("classic_subtitle")}</small>
          </button>
          <button
            type="button"
            class="ow-edition-tab ${this.edition === "operations" ? "is-active" : ""}"
            aria-pressed=${this.edition === "operations" ? "true" : "false"}
            @click=${() => this.selectEdition("operations")}
          >
            <span class="ow-edition-tab-mark ow-edition-tab-mark-operations" aria-hidden="true"></span>
            <span>${this.t("operations_label")}</span>
            <small>${this.t("operations_subtitle")}</small>
          </button>
        </div>
      </section>
    `;
  }

  private renderOperationsDashboard() {
    return html`
      <section class="ow-operations-dashboard" ?hidden=${this.edition !== "operations"}>
        <div class="ow-operations-hero">
          <div class="ow-operations-hero-content">
            <div class="ow-operations-kicker">
              <span class="ow-status-dot" aria-hidden="true"></span>
              ${this.t("operations_eyebrow")}
            </div>
            <h2>${this.t("operations_headline")}</h2>
            <p>${this.copy(
              "در نسخهٔ جدید، پیروزی فقط به گسترش قلمرو وابسته نیست. خطوط تدارکاتی، اطلاعات میدان، اهداف چندمرحله‌ای و تصمیم‌های تیمی به هستهٔ بازی اضافه خواهند شد.",
              "The new edition is designed around more than territorial expansion. Supply lines, battlefield intelligence, multi-stage objectives and team decisions are planned as core gameplay systems.",
            )}</p>
            <div class="ow-operations-actions">
              <button class="ow-action-primary" type="button" @click=${this.openTraining}>
                ${this.t("practice_action")}
                <span aria-hidden="true">↗</span>
              </button>
              <button class="ow-action-secondary" type="button" @click=${this.openPublicBattles}>
                ${this.t("browse_battles_action")}
              </button>
            </div>
            <small class="ow-honest-note">${this.copy(
              "تمرین و نبردهای آنلاین فعلاً از موتور و قوانین موجود استفاده می‌کنند؛ مکانیک‌های اختصاصی Operations هنوز در حال پیاده‌سازی‌اند.",
              "Practice and live battles currently use the existing game rules. The exclusive Operations mechanics are still being implemented.",
            )}</small>
          </div>
          <div class="ow-theatre-map" role="img" aria-label=${this.t("theatre_map_alt")}>
            <div class="ow-map-grid"></div>
            <div class="ow-map-contours"></div>
            <div class="ow-map-route ow-map-route-one"></div>
            <div class="ow-map-route ow-map-route-two"></div>
            <span class="ow-map-point ow-map-point-base">HQ</span>
            <span class="ow-map-point ow-map-point-depot">DEPOT</span>
            <span class="ow-map-point ow-map-point-objective">OBJ 04</span>
            <span class="ow-map-coordinate ow-map-coordinate-top">38° 12′ N · 46° 17′ E</span>
            <span class="ow-map-coordinate ow-map-coordinate-bottom">THEATRE / 04</span>
            <span class="ow-map-compass" aria-hidden="true">N</span>
          </div>
        </div>

        <div class="ow-operations-section-heading">
          <div>
            <span class="ow-edition-eyebrow">${this.t("systems_eyebrow")}</span>
            <h3>${this.t("systems_title")}</h3>
          </div>
          <span class="ow-roadmap-status">${this.t("in_development")}</span>
        </div>

        <div class="ow-systems-grid">
          <article class="ow-system-card">
            <span class="ow-system-index">01</span>
            <span class="ow-system-icon" aria-hidden="true">⌁</span>
            <h4>${this.t("supply_title")}</h4>
            <p>${this.t("supply_description")}</p>
            <span class="ow-system-status">${this.t("mechanic_design_status")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">02</span>
            <span class="ow-system-icon" aria-hidden="true">◎</span>
            <h4>${this.t("recon_title")}</h4>
            <p>${this.t("recon_description")}</p>
            <span class="ow-system-status">${this.t("mechanic_design_status")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">03</span>
            <span class="ow-system-icon" aria-hidden="true">◇</span>
            <h4>${this.t("objectives_title")}</h4>
            <p>${this.t("objectives_description")}</p>
            <span class="ow-system-status">${this.t("mechanic_design_status")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">04</span>
            <span class="ow-system-icon" aria-hidden="true">⌘</span>
            <h4>${this.t("doctrine_title")}</h4>
            <p>${this.t("doctrine_description")}</p>
            <span class="ow-system-status">${this.t("mechanic_design_status")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">05</span>
            <span class="ow-system-icon" aria-hidden="true">⌖</span>
            <h4>${this.t("campaign_title")}</h4>
            <p>${this.t("campaign_description")}</p>
            <span class="ow-system-status">${this.t("content_design_status")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">06</span>
            <span class="ow-system-icon" aria-hidden="true">▤</span>
            <h4>${this.t("after_action_title")}</h4>
            <p>${this.t("after_action_description")}</p>
            <span class="ow-system-status">${this.t("experience_design_status")}</span>
          </article>
        </div>

        <div class="ow-operations-footer">
          <div>
            <strong>${this.t("private_room_title")}</strong>
            <p>${this.t("private_room_description")}</p>
          </div>
          <div class="ow-operations-footer-actions">
            <button class="ow-action-secondary" type="button" @click=${this.joinRoom}>${this.t("join_code_action")}</button>
            <button class="ow-action-primary" type="button" @click=${this.openPrivateRoom}>${this.t("create_room_action")}</button>
          </div>
        </div>
      </section>
    `;
  }

  render() {
    return html`
      <main class="ow-edition-hub">
        ${this.renderEditionControl()}
        <section class="ow-classic-edition" ?hidden=${this.edition !== "classic"}>
          <div class="ow-classic-heading">
            <span class="ow-edition-eyebrow">${this.t("classic_eyebrow")}</span>
            <h2>${this.t("classic_title")}</h2>
            <p>${this.copy(
              "همان سبک آشنای نبردهای قلمرویی و مسابقات سریع؛ مستقل و بدون تغییر در قوانین فعلی.",
              "The familiar territory-control experience and quick matches, with the existing game rules preserved.",
            )}</p>
          </div>
          <game-mode-selector></game-mode-selector>
        </section>
        ${this.renderOperationsDashboard()}
      </main>
    `;
  }
}
