import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import "../GameModeSelector";
import { whenModalLoaded } from "../LazyModals";
import type { SinglePlayerModal } from "../SinglePlayerModal";
import { UsernameInput } from "../UsernameInput";
import { translateText } from "../Utils";
import {
  canPlayOperationsInCurrentBrowser,
  getOpenWarEditionPreference,
  setOpenWarEditionPreference,
  type OperationsOnlineAction,
  type OpenWarEdition,
} from "./EditionPreference";
import {
  getOperationsCampaignSummary,
  getOperationsMissionProgress,
  isOperationsMissionUnlocked,
  OPERATIONS_CAMPAIGN_UPDATED_EVENT,
  readOperationsCampaignProgress,
} from "./OperationsCampaign";
import {
  getOperationsMission,
  OPERATIONS_MISSIONS,
  type OperationsMissionId,
} from "./OperationsMissions";
import "./EditionHub.css";

constanttype EditionGameModeSelector = HTMLElement & {
  setEditionActive(active: boolean): void;
};

function readEditionPreference(): OpenWarEdition {
  return getOpenWarEditionPreference();
}

@customElement("openwar-edition-hub")
export class EditionHub extends LitElement {
  @state() private edition: OpenWarEdition = readEditionPreference();
  @state() private campaignProgress = readOperationsCampaignProgress();
  @state() private onlineMaintenanceAction: OperationsOnlineAction | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("language-changed", this.onLanguageChanged);
    window.addEventListener(
      OPERATIONS_CAMPAIGN_UPDATED_EVENT,
      this.onCampaignProgressUpdated,
    );
  }

  disconnectedCallback() {
    document.removeEventListener("language-changed", this.onLanguageChanged);
    window.removeEventListener(
      OPERATIONS_CAMPAIGN_UPDATED_EVENT,
      this.onCampaignProgressUpdated,
    );
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

  private onCampaignProgressUpdated = () => {
    this.campaignProgress = readOperationsCampaignProgress();
  };

  private t(key: string): string {
    return translateText(`edition_hub.${key}`);
  }

  private selectEdition = (edition: OpenWarEdition) => {
    if (this.edition === edition) return;
    this.edition = edition;
    setOpenWarEditionPreference(edition);
    this.dispatchEvent(
      new CustomEvent("openwar-edition-changed", {
        detail: { edition },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private validateUsername(): boolean {
    const input = document.querySelector(
      "username-input",
    ) as UsernameInput | null;
    return input ? input.canPlay() : true;
  }

  private openMission = (missionId: OperationsMissionId) => {
    if (!canPlayOperationsInCurrentBrowser()) return;
    if (!this.validateUsername()) return;
    const mission = getOperationsMission(missionId);
    if (
      !mission ||
      !isOperationsMissionUnlocked(mission, this.campaignProgress)
    )
      return;
    whenModalLoaded("single-player-modal", () => {
      (
        document.querySelector(
          "single-player-modal",
        ) as SinglePlayerModal | null
      )?.openForOperation(mission);
    });
  };

  private openTraining = () => this.openMission("iron-gate");

  /** Called by online controls and global navigation guards. */
  public showOnlineMaintenance(
    action: OperationsOnlineAction = "direct",
  ): void {
    this.onlineMaintenanceAction = action;
    this.requestUpdate();
  }

  private onlineMaintenanceMessage(): string {
    switch (this.onlineMaintenanceAction) {
      case "public":
        return this.t("online_public_action_notice");
      case "private":
        return this.t("online_private_action_notice");
      case "join":
        return this.t("online_join_action_notice");
      default:
        return this.t("online_section_notice");
    }
  }

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
    const campaignSummary = getOperationsCampaignSummary(this.campaignProgress);
    return html`
      <section
        class="ow-operations-dashboard"
        ?hidden=${this.edition !== "operations"}
      >
        <div class="ow-operations-hero">
          <div class="ow-operations-hero-content">
            <div class="ow-operations-kicker">
              <span class="ow-status-dot" aria-hidden="true"></span>
              ${this.t("operations_eyebrow")}
            </div>
            <h2>${this.t("operations_headline")}</h2>
            <p>${this.t("operations_description")}</p>
            <div class="ow-operations-actions">
              <button
                class="ow-action-primary"
                type="button"
                @click=${this.openTraining}
              >
                ${this.t("practice_action")}
                <span aria-hidden="true">↗</span>
              </button>
              <button
                class="ow-action-secondary ow-online-disabled-trigger"
                type="button"
                aria-describedby="ow-online-operations-note"
                @click=${() => this.showOnlineMaintenance("public")}
              >
                ${this.t("online_teaser_action")}
                <span aria-hidden="true">🔒</span>
              </button>
            </div>
            <small class="ow-honest-note"
              >${this.t("current_rules_note")}</small
            >
          </div>
          <div
            class="ow-theatre-map"
            role="img"
            aria-label=${this.t("theatre_map_alt")}
          >
            <div class="ow-map-grid"></div>
            <div class="ow-map-contours"></div>
            <div class="ow-map-route ow-map-route-one"></div>
            <div class="ow-map-route ow-map-route-two"></div>
            <span class="ow-map-point ow-map-point-base">HQ</span>
            <span class="ow-map-point ow-map-point-depot">DEPOT</span>
            <span class="ow-map-point ow-map-point-objective">OBJ 04</span>
            <span class="ow-map-coordinate ow-map-coordinate-top"
              >38° 12′ N · 46° 17′ E</span
            >
            <span class="ow-map-coordinate ow-map-coordinate-bottom"
              >THEATRE / 04</span
            >
            <span class="ow-map-compass" aria-hidden="true">N</span>
          </div>
        </div>

        <section
          class="ow-mission-section"
          aria-label=${this.t("mission_selection_title")}
        >
          <div class="ow-operations-section-heading">
            <div>
              <span class="ow-edition-eyebrow">
                ${this.t("mission_selection_eyebrow")}
              </span>
              <h3>${this.t("mission_selection_title")}</h3>
              <p>${this.t("mission_selection_description")}</p>
            </div>
            <span class="ow-roadmap-status">
              ${this.t("alpha_scenarios")}
            </span>
          </div>
          <div
            class="ow-campaign-summary"
            aria-label=${this.t("campaign_progress")}
          >
            <div>
              <strong
                >${campaignSummary.clearedMissions}/${campaignSummary.totalMissions}</strong
              ><span>${this.t("campaign_cleared")}</span>
            </div>
            <div>
              <strong>${campaignSummary.wins}</strong
              ><span>${this.t("campaign_wins")}</span>
            </div>
            <div>
              <strong
                >${campaignSummary.stars}/${campaignSummary.totalMissions * 3}</strong
              ><span>${this.t("campaign_stars")}</span>
            </div>
          </div>
          <div class="ow-mission-grid">
            ${OPERATIONS_MISSIONS.map((mission, index) => {
              const record = getOperationsMissionProgress(
                mission.id,
                this.campaignProgress,
              );
              const unlocked = isOperationsMissionUnlocked(
                  mission,
                  this.campaignProgress,
                ),
                cleared = record.wins > 0;
              const remainingWins = Math.max(
                0,
                mission.unlockWins - campaignSummary.wins,
              );
              return html` <article
                class="ow-mission-card ${unlocked ? "" : "is-locked"}"
              >
                <div class="ow-mission-card-topline">
                  <span class="ow-mission-number">OPERATION 0${index + 1}</span
                  ><span class="ow-mission-difficulty"
                    >${mission.difficulty}</span
                  ><span class="ow-mission-state"
                    >${cleared ? this.t("mission_cleared") : unlocked ? this.t("mission_available") : this.t("mission_locked")}</span
                  >
                </div>
                <h4>${this.t(`mission_${mission.translationKey}_title`)}</h4>
                <p class="ow-mission-brief">
                  ${this.t(`mission_${mission.translationKey}_brief`)}
                </p>
                <div class="ow-mission-meta">
                  <span>${mission.map}</span
                  ><span>${mission.timeLimitMinutes} MIN</span
                  ><span>${mission.winThresholdTenths / 10}% TERRITORY</span>
                </div>
                <p class="ow-mission-objective">
                  ${this.t(`mission_${mission.translationKey}_objective`)}
                </p>
                <div class="ow-mission-progress">
                  <span
                    >${record.wins} ${this.t("mission_wins")} ·
                    ${record.attempts} ${this.t("mission_attempts")}</span
                  ><span
                    class="ow-mission-stars"
                    aria-label="${record.bestStars} ${this.t("campaign_stars")}"
                    >${"★".repeat(record.bestStars)}${"☆".repeat(3 - record.bestStars)}</span
                  >
                </div>
                ${!unlocked ? html`<p class="ow-mission-unlock">${remainingWins} ${this.t("mission_wins_to_unlock")}</p>` : ""}
                <button
                  class="ow-action-primary ow-mission-launch"
                  type="button"
                  ?disabled=${!unlocked}
                  @click=${() => this.openMission(mission.id)}
                >
                  ${unlocked ? this.t("mission_start_action") : this.t("mission_locked_action")}
                  <span aria-hidden="true">${unlocked ? "↗" : "🔒"}</span>
                </button>
              </article>`;
            })}
          </div>
        </section>

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
            <span class="ow-system-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m3.5 9 8.5-4.5L20.5 9v10h-17V9Z" />
                <path d="m3.5 9 8.5 5 8.5-5M12 14v5M8 11.5h.01M16 11.5h.01" />
              </svg>
            </span>
            <h4>${this.t("supply_title")}</h4>
            <p>${this.t("supply_description")}</p>
            <span class="ow-system-status"
              >${this.t("mechanic_design_status")}</span
            >
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">02</span>
            <span class="ow-system-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="7.5" />
                <path d="m12 12 5.5-5.5M12 3v2M21 12h-2M12 21v-2M3 12h2" />
              </svg>
            </span>
            <h4>${this.t("recon_title")}</h4>
            <p>${this.t("recon_description")}</p>
            <span class="ow-system-status"
              >${this.t("mechanic_design_status")}</span
            >
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">03</span>
            <span class="ow-system-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M6 20V4M6 5h11l-2 3 2 3H6" />
                <circle cx="6" cy="18" r="1.5" />
              </svg>
            </span>
            <h4>${this.t("objectives_title")}</h4>
            <p>${this.t("objectives_description")}</p>
            <span class="ow-system-status"
              >${this.t("mechanic_design_status")}</span
            >
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">04</span>
            <span class="ow-system-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M6 5h4a4 4 0 0 1 4 4v10M14 10a4 4 0 0 1 4-4h1M14 15a4 4 0 0 0 4 4h1"
                />
                <circle cx="6" cy="5" r="2" />
                <circle cx="19" cy="6" r="2" />
                <circle cx="19" cy="19" r="2" />
              </svg>
            </span>
            <h4>${this.t("doctrine_title")}</h4>
            <p>${this.t("doctrine_description")}</p>
            <span class="ow-system-status"
              >${this.t("mechanic_design_status")}</span
            >
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">05</span>
            <span class="ow-system-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 19c5-1 3-6 8-7s4-5 8-7" />
                <circle cx="4" cy="19" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="20" cy="5" r="1.5" />
              </svg>
            </span>
            <h4>${this.t("campaign_title")}</h4>
            <p>${this.t("campaign_description")}</p>
            <span class="ow-system-status"
              >${this.t("content_design_status")}</span
            >
          </article>
          <article class="ow-system-card">
            <span class="ow-system-index">06</span>
            <span class="ow-system-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 20h16M6 17v-5M11 17V8M16 17v-3M20 17V5" />
                <path d="m5 9 5-3 5 2 5-5" />
              </svg>
            </span>
            <h4>${this.t("after_action_title")}</h4>
            <p>${this.t("after_action_description")}</p>
            <span class="ow-system-status"
              >${this.t("experience_design_status")}</span
            >
          </article>
        </div>

        <section
          class="ow-online-operations"
          aria-labelledby="ow-online-operations-title"
        >
          <div class="ow-online-operations-head">
            <div>
              <span class="ow-edition-eyebrow">
                ${this.t("online_section_eyebrow")}
              </span>
              <h3 id="ow-online-operations-title">
                ${this.t("online_section_title")}
              </h3>
              <p>${this.t("online_section_description")}</p>
            </div>
            <span class="ow-roadmap-status ow-online-operations-badge">
              <span aria-hidden="true">●</span>
              ${this.t("online_section_badge")}
            </span>
          </div>

          <div
            class="ow-online-operations-note"
            id="ow-online-operations-note"
            role="status"
          >
            <span class="ow-online-note-icon" aria-hidden="true">⌛</span>
            <p>${this.onlineMaintenanceMessage()}</p>
          </div>

          <div class="ow-online-feature-grid">
            <article class="ow-online-feature">
              <span class="ow-online-feature-icon" aria-hidden="true">◎</span>
              <div>
                <strong>${this.t("online_public_feature_title")}</strong>
                <p>${this.t("online_public_feature_description")}</p>
              </div>
            </article>
            <article class="ow-online-feature">
              <span class="ow-online-feature-icon" aria-hidden="true">▣</span>
              <div>
                <strong>${this.t("online_private_feature_title")}</strong>
                <p>${this.t("online_private_feature_description")}</p>
              </div>
            </article>
            <article class="ow-online-feature">
              <span class="ow-online-feature-icon" aria-hidden="true">⌘</span>
              <div>
                <strong>${this.t("online_matchmaking_feature_title")}</strong>
                <p>${this.t("online_matchmaking_feature_description")}</p>
              </div>
            </article>
          </div>

          <div
            class="ow-online-disabled-actions"
            aria-label=${this.t("online_disabled_actions_label")}
          >
            <button type="button" aria-describedby="ow-online-operations-note" @click=${() => this.showOnlineMaintenance("public")}>
              ${this.t("online_public_action")}
              <span aria-hidden="true">🔒</span>
            </button>
            <button type="button" aria-describedby="ow-online-operations-note" @click=${() => this.showOnlineMaintenance("private")}>
              ${this.t("online_private_action")}
              <span aria-hidden="true">🔒</span>
            </button>
            <button type="button" aria-describedby="ow-online-operations-note" @click=${() => this.showOnlineMaintenance("join")}>
              ${this.t("online_join_action")}
              <span aria-hidden="true">🔒</span>
            </button>
          </div>
        </section>
      </section>
    `;
  }

  private renderPublicOnlineOperations() {
    return html`
      <section
        class="ow-online-operations ow-online-operations-public"
        ?hidden=${this.edition !== "operations"}
        aria-labelledby="ow-online-operations-title"
      >
        <div class="ow-online-operations-head">
          <div>
            <span class="ow-edition-eyebrow">
              ${this.t("online_section_eyebrow")}
            </span>
            <h2 id="ow-online-operations-title">
              ${this.t("online_section_title")}
            </h2>
            <p>${this.t("online_section_description")}</p>
          </div>
          <span class="ow-roadmap-status ow-online-operations-badge">
            <span aria-hidden="true">●</span>
            ${this.t("online_section_badge")}
          </span>
        </div>

        <div
          class="ow-online-operations-note"
          id="ow-online-operations-note"
          role="status"
          aria-live="polite"
          data-testid="online-operations-note"
        >
          <span class="ow-online-note-icon" aria-hidden="true">⌛</span>
          <p>${this.t("online_section_notice")}</p>
        </div>

        <div class="ow-online-feature-grid">
          <article class="ow-online-feature">
            <span class="ow-online-feature-icon" aria-hidden="true">◎</span>
            <div>
              <strong>${this.t("online_public_feature_title")}</strong>
              <p>${this.t("online_public_feature_description")}</p>
            </div>
          </article>
          <article class="ow-online-feature">
            <span class="ow-online-feature-icon" aria-hidden="true">▣</span>
            <div>
              <strong>${this.t("online_private_feature_title")}</strong>
              <p>${this.t("online_private_feature_description")}</p>
            </div>
          </article>
          <article class="ow-online-feature">
            <span class="ow-online-feature-icon" aria-hidden="true">⌘</span>
            <div>
              <strong>${this.t("online_matchmaking_feature_title")}</strong>
              <p>${this.t("online_matchmaking_feature_description")}</p>
            </div>
          </article>
        </div>

        <div
          class="ow-online-disabled-actions"
          aria-label=${this.t("online_disabled_actions_label")}
        >
          <button type="button" aria-describedby="ow-online-operations-note" @click=${() => this.showOnlineMaintenance("public")}>
            ${this.t("online_public_action")}
            <span aria-hidden="true">🔒</span>
          </button>
          <button type="button" aria-describedby="ow-online-operations-note" @click=${() => this.showOnlineMaintenance("private")}>
            ${this.t("online_private_action")}
            <span aria-hidden="true">🔒</span>
          </button>
          <button type="button" aria-describedby="ow-online-operations-note" @click=${() => this.showOnlineMaintenance("join")}>
            ${this.t("online_join_action")}
            <span aria-hidden="true">🔒</span>
          </button>
        </div>
      </section>
    `;
  }

  private renderClassicSystems() {
    return html`
      <section
        class="ow-classic-systems"
        aria-label=${this.t("systems_overview_title")}
      >
        <header class="ow-classic-systems-heading">
          <span class="ow-edition-eyebrow">
            ${this.t("systems_overview_eyebrow")}
          </span>
          <h3>${this.t("systems_overview_title")}</h3>
          <p>${this.t("systems_overview_description")}</p>
        </header>
        <div class="ow-classic-systems-grid">
          <article class="ow-classic-system-card">
            <span class="ow-classic-system-index">01</span>
            <div>
              <h4>${this.t("system_lobbies_title")}</h4>
              <p>${this.t("system_lobbies_description")}</p>
            </div>
          </article>
          <article class="ow-classic-system-card">
            <span class="ow-classic-system-index">02</span>
            <div>
              <h4>${this.t("system_diplomacy_title")}</h4>
              <p>${this.t("system_diplomacy_description")}</p>
            </div>
          </article>
          <article class="ow-classic-system-card">
            <span class="ow-classic-system-index">03</span>
            <div>
              <h4>${this.t("system_warfare_title")}</h4>
              <p>${this.t("system_warfare_description")}</p>
            </div>
          </article>
          <article class="ow-classic-system-card">
            <span class="ow-classic-system-index">04</span>
            <div>
              <h4>${this.t("system_community_title")}</h4>
              <p>${this.t("system_community_description")}</p>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  private renderOperationsEdition() {
    return canPlayOperationsInCurrentBrowser()
      ? this.renderOperationsDashboard()
      : this.renderPublicOnlineOperations();
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
          ${this.renderClassicSystems()}
          <game-mode-selector></game-mode-selector>
        </section>
        ${this.renderOperationsEdition()}
      </main>
    `;
  }
}
