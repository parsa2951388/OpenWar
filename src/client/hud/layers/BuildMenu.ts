import { TileRef } from "@openfront/engine-api/game/GameMap";
import {
  BuildableUnit,
  BuildMenus,
  Gold,
  PlayerBuildableUnitType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { renderNumber } from "@openfront/engine-lib/Format";
import { assetUrl } from "@openfront/shared/AssetUrls";
import { EventBus } from "@openfront/shared/EventBus";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../../../client/Utils";
import { Controller } from "../../Controller";
import {
  CloseViewEvent,
  MouseDownEvent,
  ShowBuildMenuEvent,
  ShowEmojiMenuEvent,
} from "../../InputHandler";
import { TransformHandler } from "../../TransformHandler";
import {
  BuildUnitIntentEvent,
  SendUpgradeStructureIntentEvent,
} from "../../Transport";
import { UIState } from "../../UIState";
import { GameView } from "../../view";
const warshipIcon = assetUrl("images/BattleshipIconWhite.svg");
const aircraftCarrierIcon = assetUrl("images/AircraftCarrierIcon.svg");
const airportIcon = assetUrl("images/AirportIcon.svg");
const airFighterIcon = assetUrl("images/AirFighterIcon.svg");
const stealthFighterIcon = assetUrl("images/StealthFighterIcon.svg");
const groundAttackerIcon = assetUrl("images/GroundAttackerIcon.svg");
const cityIcon = assetUrl("images/CityIconWhite.svg");
const factoryIcon = assetUrl("images/FactoryIconWhite.svg");
const goldCoinIcon = assetUrl("images/GoldCoinIcon.svg");
const mirvIcon = assetUrl("images/MIRVIcon.svg");
const missileSiloIcon = assetUrl("images/MissileSiloIconWhite.svg");
const hydrogenBombIcon = assetUrl("images/MushroomCloudIconWhite.svg");
const atomBombIcon = assetUrl("images/NukeIconWhite.svg");
const portIcon = assetUrl("images/PortIcon.svg");
const samlauncherIcon = assetUrl("images/SamLauncherIconWhite.svg");
const shieldIcon = assetUrl("images/ShieldIconWhite.svg");

export interface BuildItemDisplay {
  unitType: PlayerBuildableUnitType;
  icon: string;
  description?: string;
  key?: string;
  countable?: boolean;
}

const buildTable: BuildItemDisplay[][] = [
  [
    {
      unitType: UnitType.AtomBomb,
      icon: atomBombIcon,
      description: "build_menu.desc.atom_bomb",
      key: "unit_type.atom_bomb",
      countable: false,
    },
    {
      unitType: UnitType.MIRV,
      icon: mirvIcon,
      description: "build_menu.desc.mirv",
      key: "unit_type.mirv",
      countable: false,
    },
    {
      unitType: UnitType.HydrogenBomb,
      icon: hydrogenBombIcon,
      description: "build_menu.desc.hydrogen_bomb",
      key: "unit_type.hydrogen_bomb",
      countable: false,
    },
    {
      unitType: UnitType.Warship,
      icon: warshipIcon,
      description: "build_menu.desc.warship",
      key: "unit_type.warship",
      countable: true,
    },
    {
      unitType: UnitType.AircraftCarrier,
      icon: aircraftCarrierIcon,
      description: "build_menu.desc.aircraft_carrier",
      key: "unit_type.aircraft_carrier",
      countable: true,
    },
    {
      unitType: UnitType.Airport,
      icon: airportIcon,
      description: "build_menu.desc.airport",
      key: "unit_type.airport",
      countable: true,
    },
    {
      unitType: UnitType.AirFighter,
      icon: airFighterIcon,
      description: "build_menu.desc.air_fighter",
      key: "unit_type.air_fighter",
      countable: true,
    },
    {
      unitType: UnitType.StealthFighter,
      icon: stealthFighterIcon,
      description: "build_menu.desc.stealth_fighter",
      key: "unit_type.stealth_fighter",
      countable: true,
    },
    {
      unitType: UnitType.GroundAttacker,
      icon: groundAttackerIcon,
      description: "build_menu.desc.ground_attacker",
      key: "unit_type.ground_attacker",
      countable: true,
    },
    {
      unitType: UnitType.Port,
      icon: portIcon,
      description: "build_menu.desc.port",
      key: "unit_type.port",
      countable: true,
    },
    {
      unitType: UnitType.MissileSilo,
      icon: missileSiloIcon,
      description: "build_menu.desc.missile_silo",
      key: "unit_type.missile_silo",
      countable: true,
    },
    {
      unitType: UnitType.SAMLauncher,
      icon: samlauncherIcon,
      description: "build_menu.desc.sam_launcher",
      key: "unit_type.sam_launcher",
      countable: true,
    },
    {
      unitType: UnitType.DefensePost,
      icon: shieldIcon,
      description: "build_menu.desc.defense_post",
      key: "unit_type.defense_post",
      countable: true,
    },
    {
      unitType: UnitType.City,
      icon: cityIcon,
      description: "build_menu.desc.city",
      key: "unit_type.city",
      countable: true,
    },
    {
      unitType: UnitType.Factory,
      icon: factoryIcon,
      description: "build_menu.desc.factory",
      key: "unit_type.factory",
      countable: true,
    },
  ],
];

export const flattenedBuildTable = buildTable.flat();

@customElement("build-menu")
export class BuildMenu extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;
  public uiState: UIState;
  private clickedTile: TileRef;
  public playerBuildables: BuildableUnit[] | null = null;
  private filteredBuildTable: BuildItemDisplay[][] = buildTable;
  public transformHandler: TransformHandler;

  init() {
    this.eventBus.on(ShowBuildMenuEvent, (e) => {
      if (!this.game.myPlayer()?.isAlive()) {
        return;
      }
      if (!this._hidden) {
        // Players sometimes hold control while building a unit,
        // so if the menu is already open, ignore the event.
        return;
      }
      const clickedCell = this.transformHandler.screenToWorldCoordinates(
        e.x,
        e.y,
      );
      if (!this.game.isValidCoord(clickedCell.x, clickedCell.y)) {
        return;
      }
      const tile = this.game.ref(clickedCell.x, clickedCell.y);
      this.showMenu(tile);
    });
    this.eventBus.on(CloseViewEvent, () => this.hideMenu());
    this.eventBus.on(ShowEmojiMenuEvent, () => this.hideMenu());
    this.eventBus.on(MouseDownEvent, () => this.hideMenu());
  }

  private _lastRefreshAt = 0;
  private static readonly REFRESH_INTERVAL_MS = 500;

  tick() {
    if (
      !this._hidden &&
      Date.now() - this._lastRefreshAt >= BuildMenu.REFRESH_INTERVAL_MS
    ) {
      void this.refresh();
    }
  }

  static styles = css`
    :host {
      display: block;
    }
    .build-menu {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      width: min(94vw, 900px);
      max-width: 94vw;
      max-height: min(88dvh, 780px);
      overflow-y: auto;
      padding: 14px;
      border: 1px solid rgba(69, 221, 207, 0.34);
      border-radius: 16px;
      background: linear-gradient(
        145deg,
        rgba(12, 32, 43, 0.98),
        rgba(8, 20, 30, 0.98)
      );
      box-shadow:
        0 18px 48px rgba(0, 0, 0, 0.48),
        inset 0 1px rgba(255, 255, 255, 0.05);
      overscroll-behavior: contain;
    }
    .build-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
      gap: 8px;
      width: 100%;
      margin-bottom: 8px;
    }
    .build-button {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      width: 100%;
      min-width: 0;
      min-height: 136px;
      margin: 0;
      padding: 10px 8px 9px;
      gap: 4px;
      border: 1px solid rgba(142, 175, 188, 0.28);
      border-radius: 11px;
      background: linear-gradient(
        160deg,
        rgba(38, 64, 75, 0.92),
        rgba(21, 39, 50, 0.96)
      );
      color: #f2fbff;
      cursor: pointer;
      text-align: center;
      transition:
        border-color 120ms ease,
        background-color 120ms ease,
        transform 120ms ease;
    }
    .build-button:not(:disabled):hover {
      border-color: rgba(101, 228, 216, 0.72);
      background: linear-gradient(
        160deg,
        rgba(46, 88, 94, 0.96),
        rgba(24, 53, 63, 0.98)
      );
    }
    .build-button:not(:disabled):active {
      transform: scale(0.98);
    }
    .build-button:disabled {
      border-color: rgba(120, 140, 148, 0.18);
      background: rgba(12, 25, 34, 0.9);
      cursor: not-allowed;
      opacity: 0.64;
    }
    .build-button img {
      width: 34px;
      height: 34px;
      flex: 0 0 auto;
      object-fit: contain;
    }
    .build-name {
      min-height: 2.2em;
      margin: 0;
      color: #f5fbff;
      font-size: 12px;
      font-weight: 850;
      line-height: 1.1;
      text-align: center;
      overflow-wrap: anywhere;
    }
    .build-description {
      display: -webkit-box;
      min-height: 2.35em;
      overflow: hidden;
      color: #a9c0c8;
      font-size: 9px;
      line-height: 1.2;
      text-align: center;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
    .build-cost {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-top: auto;
      color: #ffd08c;
      font-size: 12px;
      font-weight: 900;
      line-height: 1.2;
      white-space: nowrap;
    }
    .build-button:disabled .build-cost {
      color: #ff8c83;
    }
    .build-cost img {
      width: 13px;
      height: 13px;
    }
    .hidden {
      display: none !important;
    }
    .build-count-chip {
      position: absolute;
      top: 5px;
      right: 5px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-width: 21px;
      padding: 2px 6px;
      border: 1px solid rgba(101, 228, 216, 0.36);
      border-radius: 999px;
      background: rgba(7, 21, 31, 0.9);
      color: #e4f6f5;
      font-size: 10px;
    }
    .build-count {
      font-weight: 850;
      font-size: 10px;
    }
    @media (max-width: 640px) {
      .build-menu {
        width: 94vw;
        max-height: 88dvh;
        padding: 9px;
      }
      .build-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 6px;
      }
      .build-button {
        min-height: 122px;
        padding: 8px 5px 7px;
        gap: 3px;
      }
      .build-button img {
        width: 29px;
        height: 29px;
      }
      .build-name {
        min-height: 2.2em;
        font-size: 11px;
      }
      .build-description {
        min-height: 2.2em;
        font-size: 8px;
      }
      .build-cost {
        font-size: 11px;
      }
      .build-cost img {
        width: 12px;
        height: 12px;
      }
    }
    @media (max-width: 360px) {
      .build-menu {
        width: 96vw;
        padding: 7px;
      }
      .build-row {
        gap: 4px;
      }
      .build-button {
        min-height: 116px;
        padding: 7px 3px 6px;
      }
      .build-name {
        font-size: 10px;
      }
      .build-description {
        font-size: 7.5px;
      }
      .build-cost {
        font-size: 10px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .build-button {
        transition: none;
      }
    }
  `;

  @state()
  private _hidden = true;

  public canBuildOrUpgrade(item: BuildItemDisplay): boolean {
    if (this.game?.myPlayer() === null || this.playerBuildables === null) {
      return false;
    }
    const unit = this.playerBuildables.find((u) => u.type === item.unitType);
    if (this.uiState.preventStacking) return !!unit && unit.canBuild !== false;
    return unit ? unit.canBuild !== false || unit.canUpgrade !== false : false;
  }

  public cost(item: BuildItemDisplay): Gold {
    for (const bu of this.playerBuildables ?? []) {
      if (bu.type === item.unitType) {
        return bu.cost;
      }
    }
    return 0n;
  }

  public count(item: BuildItemDisplay): string {
    const player = this.game?.myPlayer();
    if (!player) {
      return "?";
    }

    return player.totalUnitLevels(item.unitType).toString();
  }

  public sendBuildOrUpgrade(buildableUnit: BuildableUnit, tile: TileRef): void {
    if (buildableUnit.canUpgrade !== false && !this.uiState.preventStacking) {
      this.eventBus.emit(
        new SendUpgradeStructureIntentEvent(
          buildableUnit.canUpgrade,
          buildableUnit.type,
        ),
      );
    } else if (buildableUnit.canBuild !== false) {
      const rocketDirectionUp =
        buildableUnit.type === UnitType.AtomBomb ||
        buildableUnit.type === UnitType.HydrogenBomb
          ? this.uiState.rocketDirectionUp
          : undefined;
      this.eventBus.emit(
        new BuildUnitIntentEvent(buildableUnit.type, tile, rocketDirectionUp),
      );
    }
    this.hideMenu();
  }

  render() {
    return html`
      <div
        class="build-menu ${this._hidden ? "hidden" : ""}"
        @contextmenu=${(e: MouseEvent) => e.preventDefault()}
      >
        ${this.filteredBuildTable.map(
          (row) => html`
            <div class="build-row">
              ${row.map((item) => {
                const buildableUnit = this.playerBuildables?.find(
                  (bu) => bu.type === item.unitType,
                );
                if (buildableUnit === undefined) {
                  return html``;
                }
                const enabled = this.canBuildOrUpgrade(item);
                return html`
                  <button
                    class="build-button"
                    @click=${() =>
                      this.sendBuildOrUpgrade(buildableUnit, this.clickedTile)}
                    ?disabled=${!enabled}
                    title=${
                      !enabled
                        ? translateText("build_menu.not_enough_money")
                        : ""
                    }
                  >
                    <img
                      src=${item.icon}
                      alt="${item.unitType}"
                      width="40"
                      height="40"
                    />
                    <span class="build-name">
                      ${item.key && translateText(item.key)}
                    </span>
                    <span class="build-description"
                      >${
                        item.description && translateText(item.description)
                      }</span
                    >
                    <span class="build-cost" translate="no">
                      ${renderNumber(
                        this.game && this.game.myPlayer() ? this.cost(item) : 0,
                      )}
                      <img
                        src=${goldCoinIcon}
                        alt="gold"
                        width="12"
                        height="12"
                        class="align-middle"
                      />
                    </span>
                    ${
                      item.countable
                        ? html`<div class="build-count-chip">
                            <span class="build-count">${this.count(item)}</span>
                          </div>`
                        : ""
                    }
                  </button>
                `;
              })}
            </div>
          `,
        )}
      </div>
    `;
  }

  hideMenu() {
    this._hidden = true;
    this.requestUpdate();
  }

  showMenu(clickedTile: TileRef) {
    this.clickedTile = clickedTile;
    this._hidden = false;
    void this.refresh();
  }

  private refresh() {
    this._lastRefreshAt = Date.now();
    const refresh = this.game
      .myPlayer()
      ?.buildables(this.clickedTile, BuildMenus.types)
      .then((buildables) => {
        this.playerBuildables = buildables;
        this.requestUpdate();
      })
      .catch((error) => {
        // Retain the last successful snapshot, including newer overlapping replies.
        console.warn("Failed to refresh build menu", error);
      });

    // remove disabled buildings from the buildtable
    this.filteredBuildTable = this.getBuildableUnits();
    return refresh;
  }

  private getBuildableUnits(): BuildItemDisplay[][] {
    return buildTable.map((row) =>
      row.filter((item) => !this.game?.config()?.isUnitDisabled(item.unitType)),
    );
  }

  get isVisible() {
    return !this._hidden;
  }
}
