import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import "../GameModeSelector";
import { translateText } from "../Utils";
import {
  normalizeOpenWarEdition,
  type OpenWarEdition,
} from "./EditionPreference";
import "./EditionHub.css";

const EDITION_STORAGE_KEY = "openwar.edition";

type EditionGameModeSelector = HTMLElement & {
  setEditionActive(active: boolean): void;
};

function readEditionPreference(): OpenWarEdition {
  try {
    return normalizeOpenWarEdition(
      window.localStorage.getItem(EDITION_STORAGE_KEY),
    );
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

  protected updated(): void {
    const selector = this.querySelector(
      "game-mode-selector",
    ) as EditionGameModeSelector | null;
    selector?.setEditionActive(this.edition === "classic");
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

  private renderEditionControl() {
    return html`
      <section
        class="ow-edition-header"
        aria-label=${this.t("choose_experience")}
      >
        <div class="ow-edition-heading">
          <span class="ow-edition-eyebrow">${this.t("top_eyebrow")}</span>
          <h1>${this.t("intro_title")}</h1>
          <p>${this.t("intro_description")}</p>
        </div>
        <div
          class="ow-edition-switch"
          role="group"
          aria-label=${this.t("edition_switch_label")}
        >
          <button
            type="button"
            class="ow-edition-tab ${this.edition === "classic" ? "is-active" : ""}"
            aria-pressed=${this.edition === "classic" ? "true" : "false"}
            @click=${() => this.selectEdition("classic")}
          >
            <span
              class="ow-edition-tab-mark ow-edition-tab-mark-classic"
              aria-hidden="true"
            ></span>
            <span>${this.t("classic_title")}</span>
            <small>${this.t("classic_subtitle")}</small>
          </button>
          <button
            type="button"
            class="ow-edition-tab ${this.edition === "operations" ? "is-active" : ""}"
            aria-pressed=${this.edition === "operations" ? "true" : "false"}
            @click=${() => this.selectEdition("operations")}
          >
            <span
              class="ow-edition-tab-mark ow-edition-tab-mark-operations"
              aria-hidden="true"
            ></span>
            <span>${this.t("operations_label")}</span>
            <small>${this.t("operations_subtitle")}</small>
          </button>
        </div>
      </section>
    `;
  }

  private renderOperationsDashboard() {
    return html`
      <section
        class="ow-operations-dashboard ow-operations-coming-soon"
        ?hidden=${this.edition !== "operations"}
        aria-labelledby="ow-coming-soon-title"
      >
        <div class="ow-coming-soon-hero">
          <div class="ow-coming-soon-copy">
            <div class="ow-operations-kicker">
              <span class="ow-status-dot" aria-hidden="true"></span>
              ${this.t("coming_soon_eyebrow")}
            </div>
            <span class="ow-coming-soon-badge">
              <span aria-hidden="true">◷</span>
              ${this.t("coming_soon_label")}
            </span>
            <h2 id="ow-coming-soon-title">
              ${this.t("coming_soon_title")}
            </h2>
            <p>${this.t("coming_soon_body")}</p>
            <button
              class="ow-action-primary"
              type="button"
              @click=${() => this.selectEdition("classic")}
            >
              ${this.t("coming_soon_classic_action")}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div class="ow-coming-soon-visual" aria-hidden="true">
            <div class="ow-coming-soon-radar ow-coming-soon-radar-one"></div>
            <div class="ow-coming-soon-radar ow-coming-soon-radar-two"></div>
            <div class="ow-coming-soon-crosshair">+</div>
            <span class="ow-coming-soon-coordinate ow-coming-soon-coordinate-a">OW / OPS-01</span>
            <span class="ow-coming-soon-coordinate ow-coming-soon-coordinate-b">SYSTEM STATUS · BUILDING</span>
            <span class="ow-coming-soon-marker ow-coming-soon-marker-a"></span>
            <span class="ow-coming-soon-marker ow-coming-soon-marker-b"></span>
            <span class="ow-coming-soon-marker ow-coming-soon-marker-c"></span>
            <span class="ow-coming-soon-path"></span>
          </div>
        </div>

        <div class="ow-coming-soon-section">
          <div>
            <span class="ow-edition-eyebrow">${this.t("coming_soon_features_eyebrow")}</span>
            <h3>${this.t("coming_soon_features_title")}</h3>
          </div>
          <div class="ow-coming-soon-grid">
            <article class="ow-coming-soon-card">
              <span class="ow-coming-soon-card-icon" aria-hidden="true">⌁</span>
              <h4>${this.t("coming_soon_supply_title")}</h4>
              <p>${this.t("coming_soon_supply_body")}</p>
              <span class="ow-coming-soon-card-status">${this.t("coming_soon_planned")}</span>
            </article>
            <article class="ow-coming-soon-card">
              <span class="ow-coming-soon-card-icon" aria-hidden="true">◎</span>
              <h4>${this.t("coming_soon_recon_title")}</h4>
              <p>${this.t("coming_soon_recon_body")}</p>
              <span class="ow-coming-soon-card-status">${this.t("coming_soon_planned")}</span>
            </article>
            <article class="ow-coming-soon-card">
              <span class="ow-coming-soon-card-icon" aria-hidden="true">⚑</span>
              <h4>${this.t("coming_soon_objectives_title")}</h4>
              <p>${this.t("coming_soon_objectives_body")}</p>
              <span class="ow-coming-soon-card-status">${this.t("coming_soon_planned")}</span>
            </article>
            <article class="ow-coming-soon-card">
              <span class="ow-coming-soon-card-icon" aria-hidden="true">◉</span>
              <h4>${this.t("coming_soon_coop_campaign_title")}</h4>
              <p>${this.t("coming_soon_coop_campaign_body")}</p>
              <span class="ow-coming-soon-card-status">${this.t("coming_soon_planned")}</span>
            </article>
          </div>
          <p class="ow-coming-soon-footnote">${this.t("coming_soon_notice")}</p>
        </div>
      </section>
    `;
  }

  render() {
    return html`
      <main class="ow-edition-hub">
        ${this.renderEditionControl()}
        <section
          class="ow-classic-edition"
          ?hidden=${this.edition !== "classic"}
        >
          <div class="ow-classic-heading">
            <span class="ow-edition-eyebrow">${this.t("classic_eyebrow")}</span>
            <h2>${this.t("classic_title")}</h2>
            <p>${this.t("classic_description")}</p>
          </div>
          <game-mode-selector></game-mode-selector>
        </section>
        ${this.renderOperationsDashboard()}
      </main>
    `;
  }
}
