import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import "../GameModeSelector";
import { whenModalLoaded } from "../LazyModals";
import type { HostLobbyModal } from "../HostLobbyModal";
import type { JoinLobbyModal } from "../JoinLobbyModal";
import type { SinglePlayerModal } from "../SinglePlayerModal";
import { UsernameInput } from "../UsernameInput";
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
  @state() private locale = document.documentElement.lang;

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
    this.locale = document.documentElement.lang;
  };

  private isPersian(): boolean {
    return this.locale.toLowerCase().startsWith("fa");
  }

  private copy(persian: string, english: string): string {
    return this.isPersian() ? persian : english;
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
      <section class="ow-edition-header" aria-label=${this.copy("انتخاب تجربهٔ بازی", "Choose your game experience")}>
        <div class="ow-edition-heading">
          <span class="ow-edition-eyebrow">${this.copy("دو مسیر، یک جهان", "TWO WAYS TO COMMAND")}</span>
          <h1>${this.copy("دنیای Open War را انتخاب کن", "Choose your Open War experience")}</h1>
          <p>${this.copy(
            "تجربهٔ کلاسیک را برای نبرد سریع انتخاب کن یا وارد میز عملیات و مسیر توسعهٔ جدید شو.",
            "Choose the familiar classic battlefield or explore the new Operations command experience.",
          )}</p>
        </div>
        <div class="ow-edition-switch" role="group" aria-label=${this.copy("حالت بازی", "Game edition")}>
          <button
            type="button"
            class="ow-edition-tab ${this.edition === "classic" ? "is-active" : ""}"
            aria-pressed=${this.edition === "classic" ? "true" : "false"}
            @click=${() => this.selectEdition("classic")}
          >
            <span class="ow-edition-tab-mark ow-edition-tab-mark-classic" aria-hidden="true"></span>
            <span>${this.copy("کلاسیک", "Classic")}</span>
            <small>${this.copy("نبردهای قلمرویی", "Territory warfare")}</small>
          </button>
          <button
            type="button"
            class="ow-edition-tab ${this.edition === "operations" ? "is-active" : ""}"
            aria-pressed=${this.edition === "operations" ? "true" : "false"}
            @click=${() => this.selectEdition("operations")}
          >
            <span class="ow-edition-tab-mark ow-edition-tab-mark-operations" aria-hidden="true"></span>
            <span>${this.copy("عملیات جدید", "New · Operations")}</span>
            <small>${this.copy("فرماندهی و لجستیک", "Command and logistics")}</small>
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
              ${this.copy("میز فرماندهی · پیش‌نمایش محصول", "COMMAND DESK · PRODUCT PREVIEW")}
            </div>
            <h2>${this.copy("هر نبرد، یک عملیات استراتژیک", "Every battle is a strategic operation")}</h2>
            <p>${this.copy(
              "در نسخهٔ جدید، پیروزی فقط به گسترش قلمرو وابسته نیست. خطوط تدارکاتی، اطلاعات میدان، اهداف چندمرحله‌ای و تصمیم‌های تیمی به هستهٔ بازی اضافه خواهند شد.",
              "The new edition is designed around more than territorial expansion. Supply lines, battlefield intelligence, multi-stage objectives and team decisions are planned as core gameplay systems.",
            )}</p>
            <div class="ow-operations-actions">
              <button class="ow-action-primary" type="button" @click=${this.openTraining}>
                ${this.copy("ورود به تمرین فعلی", "Enter current practice")}
                <span aria-hidden="true">↗</span>
              </button>
              <button class="ow-action-secondary" type="button" @click=${this.openPublicBattles}>
                ${this.copy("مشاهدهٔ نبردهای آنلاین", "Browse live battles")}
              </button>
            </div>
            <small class="ow-honest-note">${this.copy(
              "تمرین و نبردهای آنلاین فعلاً از موتور و قوانین موجود استفاده می‌کنند؛ مکانیک‌های اختصاصی Operations هنوز در حال پیاده‌سازی‌اند.",
              "Practice and live battles currently use the existing game rules. The exclusive Operations mechanics are still being implemented.",
            )}</small>
          </div>
          <div class="ow-theatre-map" role="img" aria-label=${this.copy("نمای مفهومی نقشهٔ عملیاتی با خطوط ارتفاع و مسیرهای تدارکاتی", "Conceptual theatre map with contour lines and supply routes")}>
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
            <span class="ow-edition-eyebrow">${this.copy("سیستم‌های اختصاصی", "SIGNATURE SYSTEMS")}</span>
            <h3>${this.copy("چیزی فراتر از قلمروگیری", "Beyond territorial control")}</h3>
          </div>
          <span class="ow-roadmap-status">${this.copy("در حال توسعه", "IN DEVELOPMENT")}</span>
        </div>

        <div class="ow-systems-grid">
          <article class="ow-system-card">
            <span class="ow-system-index">01</span>
            <span class="ow-system-icon" aria-hidden="true">⌁</span>
            <h4>${this.copy("شبکهٔ تدارکات", "Supply network")}</h4>
            <p>${this.copy("انبارها، مسیرهای زمینی، بندرها و کاروان‌ها؛ قطع مسیر دشمن می‌تواند نتیجهٔ نبرد را تغییر دهد.", "Depots, roads, ports and convoys. Disrupting an enemy supply route can change the outcome of a battle.")}</p>
            <span class="ow-system-status">${this.copy("طراحی مکانیک", "MECHANIC DESIGN")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">02</span>
            <span class="ow-system-icon" aria-hidden="true">◎</span>
            <h4>${this.copy("شناسایی و اطلاعات", "Recon and intelligence")}</h4>
            <p>${this.copy("رادار، مه جنگ و گزارش‌هایی با زمان و میزان اطمینان؛ همه‌چیز همیشه برای همه آشکار نیست.", "Radar, fog of war and intelligence reports with age and confidence. Information is never automatically complete.")}</p>
            <span class="ow-system-status">${this.copy("طراحی مکانیک", "MECHANIC DESIGN")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">03</span>
            <span class="ow-system-icon" aria-hidden="true">◇</span>
            <h4>${this.copy("اهداف عملیاتی", "Operational objectives")}</h4>
            <p>${this.copy("مراکز فرماندهی، مناطق کلیدی، اسکورت کاروان و مأموریت‌های چندمرحله‌ای.", "Command centres, strategic locations, convoy escort and multi-stage missions.")}</p>
            <span class="ow-system-status">${this.copy("طراحی مکانیک", "MECHANIC DESIGN")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">04</span>
            <span class="ow-system-icon" aria-hidden="true">⌘</span>
            <h4>${this.copy("دکترین و نقش‌ها", "Doctrine and roles")}</h4>
            <p>${this.copy("تخصص‌های لجستیک، شناسایی، دفاع و تحرک برای هماهنگی بهتر تیم.", "Logistics, reconnaissance, defence and mobility specialisations for coordinated teams.")}</p>
            <span class="ow-system-status">${this.copy("طراحی مکانیک", "MECHANIC DESIGN")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">05</span>
            <span class="ow-system-icon" aria-hidden="true">⌖</span>
            <h4>${this.copy("کمپین گروهی", "Co-op campaign")}</h4>
            <p>${this.copy("مأموریت‌های طراحی‌شده برای بازی انفرادی یا همکاری چندنفره علیه هوش مصنوعی.", "Authored missions for solo play or cooperative operations against AI.")}</p>
            <span class="ow-system-status">${this.copy("طراحی محتوا", "CONTENT DESIGN")}</span>
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">06</span>
            <span class="ow-system-icon" aria-hidden="true">▤</span>
            <h4>${this.copy("گزارش پس از نبرد", "After-action review")}</h4>
            <p>${this.copy("خط زمانی رویدادها، عملکرد تیم، مسیر تدارکات و تصمیم‌های تعیین‌کنندهٔ مسابقه.", "Event timeline, team contribution, logistics history and the decisions that shaped the match.")}</p>
            <span class="ow-system-status">${this.copy("طراحی تجربه", "EXPERIENCE DESIGN")}</span>
          </article>
        </div>

        <div class="ow-operations-footer">
          <div>
            <strong>${this.copy("اتاق خصوصی برای دوستانت بساز", "Set up a private room for your group")}</strong>
            <p>${this.copy("ساخت اتاق فعلاً از مسیر فعلی لابی انجام می‌شود؛ پیکربندی اختصاصی Operations بعداً به آن متصل می‌شود.", "Room creation currently uses the existing lobby flow. Operations-specific match rules will be connected in a later implementation phase.")}</p>
          </div>
          <div class="ow-operations-footer-actions">
            <button class="ow-action-secondary" type="button" @click=${this.joinRoom}>${this.copy("پیوستن با کد", "Join with code")}</button>
            <button class="ow-action-primary" type="button" @click=${this.openPrivateRoom}>${this.copy("ساخت اتاق", "Create room")}</button>
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
            <span class="ow-edition-eyebrow">${this.copy("تجربهٔ اصلی", "THE ORIGINAL EXPERIENCE")}</span>
            <h2>${this.copy("کلاسیک", "Classic")}</h2>
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
