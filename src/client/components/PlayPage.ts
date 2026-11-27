import { assetUrl } from "@openfront/shared/AssetUrls";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { translateText } from "../Translate";
import "./CosmeticBackground";
import "./NavAccountMenu";
import "./NavUtilityIcons";
import "./NewsBox";
import "./StreamingNow";

@customElement("play-page")
export class PlayPage extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        id="page-play"
        class="ow-home-page flex flex-col gap-3 w-full px-0 lg:px-4 min-h-0"
      >
        <token-login class="absolute"></token-login>
        <rewards-modal class="absolute"></rewards-modal>

        <!-- Mobile: Fixed top bar -->
        <div
          class="ow-mobile-topbar lg:hidden"
        >
          <div
            class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center h-14 px-2 gap-2"
          >
            <button
              id="hamburger-btn"
              class="ow-hamburger"
              data-i18n-aria-label="main.menu"
              aria-expanded="false"
              aria-controls="sidebar-menu"
              aria-haspopup="dialog"
              data-i18n-title="main.menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            <div
              class="col-start-2 flex items-center justify-center text-malibu-blue min-w-0"
            >
              <img
                src=${assetUrl("images/OpenWarLogo.svg")}
                alt="Open War"
                class="ow-mobile-wordmark h-full w-auto"
              />
            </div>

            <!-- Right slot: bell, help, settings and the profile control. The menu is
                 the account affordance on every platform now — on CrazyGames
                 its "Sign in" item hands off to their SDK prompt. -->
            <div
              class="col-start-3 justify-self-end shrink-0 flex items-center gap-0.5"
            >
              <nav-utility-icons size="mobile"></nav-utility-icons>
              <nav-account-menu variant="mobile"></nav-account-menu>
            </div>
          </div>
        </div>

        <!-- Top strip: news + identity on the left, Streaming Now on the right. The 2fr/1fr
             split only exists while the panel is live (.streaming-live via has-[]) —
             otherwise the left column takes the full row. -->
        <div
          class="group/strip ow-strip"
        >
          <!-- Mobile: spacer for fixed top bar -->
          <div
            class="lg:hidden h-[calc(env(safe-area-inset-top)+56px)] -mb-4"
          ></div>

          <!-- Left column: news banner + identity row, stacked tight. -->
          <div class="flex flex-col gap-2 min-w-0">
            <!-- Off on compact screens (see styles.css), like Streaming Now. -->
            <news-box class="compact:hidden"></news-box>

            <!-- Identity row: username over the currently selected cosmetic background. -->
            <div
              class="ow-callsign-panel bg-surface border-y border-white/10 sm:min-h-[60px] sm:compact:min-h-[45px]"
            >
              <!-- Selected skin/pattern fills the bubble like the player's territory in game. -->
              <cosmetic-background
                class="absolute inset-0 z-0 overflow-hidden sm:rounded-xl pointer-events-none"
              ></cosmetic-background>
              <div
                class="ow-callsign-shell"
              >
                <span class="ow-field-label">${translateText("open_war.commander_callsign")}</span>
                <username-input
                  class="flex-1 min-w-0 h-10 sm:h-[46px] sm:compact:h-[36px]"
                ></username-input>
              </div>
            </div>
          </div>

          <!-- Right column: Streaming Now (desktop only), stretched to the left column's
               full height so the top strip has no dead space. -->
          <streaming-now
            class="hidden lg:flex lg:h-full lg:flex-col w-full min-w-0"
          ></streaming-now>
        </div>

        <section class="ow-hero" aria-labelledby="ow-hero-title">
          <div class="ow-hero__copy">
            <div class="ow-hero__eyebrow">
              <span class="ow-signal-dot"></span>
              OPEN WAR <span class="ow-hero__divider">/</span> ${translateText("open_war.hero_eyebrow")}
            </div>
            <h1 id="ow-hero-title" aria-label=${translateText("open_war.hero_title")}>
              ${translateText("open_war.hero_title_prefix")}
              <span>${translateText("open_war.hero_title_focus")}</span>
            </h1>
            <p>${translateText("open_war.hero_description")}</p>
            <div class="ow-hero__data">
              <span><b>01</b> ${translateText("open_war.choose_theatre")}</span>
              <span><b>02</b> ${translateText("open_war.deploy_strategy")}</span>
            </div>
          </div>
          <div class="ow-hero__visual" aria-hidden="true">
            <div class="ow-hero__radar ow-hero__radar--outer"></div>
            <div class="ow-hero__radar ow-hero__radar--inner"></div>
            <svg class="ow-hero__map" viewBox="0 0 440 300" fill="none">
              <path
                d="m62 105 29-39 46-18 22 15 37-3 24 22 39-5 23 18 44 1 29 31-12 23 23 31-23 27-40-8-24 21-31-10-17 20-35-7-12-29-34-8-25-32-36-5-17-28-31 1-14-18Z"
                fill="#183849"
                stroke="#6de3da"
                stroke-width="2"
              />
              <path
                d="m165 63 18 47-18 31 31 27-10 29m60-99-24 34 28 20-5 38m66-83-17 29 22 27m-157-26-32 10m78-74 33 2 28 26 38-7m-86 82 36-19 32 11"
                stroke="#7da7b5"
                stroke-width="1.2"
                stroke-dasharray="4 6"
                opacity=".7"
              />
              <path
                d="M34 150h372M220 18v264M70 48l300 204M75 250 370 45"
                stroke="#467889"
                stroke-width=".8"
                stroke-dasharray="2 9"
                opacity=".45"
              />
                            <circle
                cx="220"
                cy="150"
                r="90"
                stroke="#6de3da"
                stroke-width="1.3"
                opacity=".45"
              />
              <circle
                cx="220"
                cy="150"
                r="55"
                stroke="#d6aa5c"
                stroke-width="1.2"
                stroke-dasharray="4 5"
                opacity=".65"
              />
                            <circle cx="220" cy="150" r="7" fill="#f3cf8b" />
              <path
                d="M220 130v-16m0 72v-16m-20-20h-16m72 0h-16"
                stroke="#f3cf8b"
                stroke-width="2"
              />
              <circle cx="122" cy="104" r="5" fill="#f3cf8b" />
              <circle cx="317" cy="196" r="4" fill="#6de3da" />
              <circle cx="286" cy="83" r="3" fill="#f3cf8b" />
            </svg>
            <div class="ow-hero__readout">
              <span>${translateText("open_war.theatre_status")}</span>
              <strong>${translateText("open_war.ready_for_deployment")}</strong>
              <i></i>
            </div>
            <div class="ow-hero__coordinates">GRID 09:24&nbsp;&nbsp; / &nbsp;&nbsp;SECTOR A</div>
          </div>
          <div class="ow-hero__index">OW / 001 <span>${translateText("open_war.global_conflict_network")}</span></div>
        </section>

        <game-mode-selector></game-mode-selector>
      </div>
    `;
  }
}
