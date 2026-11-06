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
const cityIcon = assetUrl("images/CityIconWhite.svg");
const factoryIcon = assetUrl("images/FactoryIconWhite.svg");
const goldCoinIcon = assetUrl("images/GoldCoinIcon.svg");
const mirvIcon = assetUrl("images/MIRVIcon.svg");
const missileSiloIcon = assetUrl("images/MissileSiloIconWhite.svg");
const hydrogenBombIcon = assetUrl("images/MushroomCloudIconWhite.svg");
const atomBombIcon = assetUrl("images/NukeIconWhite.svg");
const airportIcon = assetUrl("images/AirportIconWhite.svg");
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
    {
      unitType: UnitType.Airport,
      icon: airportIcon,
      description: "build_menu.desc.airport",
      key: "unit_type.airport",
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
  private refreshRequestId = 0;
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

  getTickIntervalMs(): number {
    // This snapshot is not frame-critical; avoid repeated worker calculations
    // while the menu is open on mobile.
    return 1000;
  }

  tick() {
    if (!this._hidden) {
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
      background-color: #1e1e1e;
      padding: 15px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      max-width: 95vw;
      max-height: 95vh;
      overflow-y: auto;
    }
    .build-description {
      font-size: 0.6rem;
    }
    .build-row {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      width: 100%;
    }
    .build-button {
      position: relative;
      width: 120px;
      height: 140px;
      border: 2px solid #444;
      background-color: #2c2c2c;
      color: white;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin: 8px;
      padding: 10px;
      gap: 5px;
    }
    .build-button:not(:disabled):hover {
      background-color: #3a3a3a;
      transform: scale(1.05);
      border-color: #666;
    }
    .build-button:not(:disabled):active {
      background-color: #4a4a4a;
      transform: scale(0.95);
    }
    .build-button:disabled {
      background-color: #1a1a1a;
      border-color: #333;
      cursor: not-allowed;
      opacity: 0.7;
    }
    .build-button:disabled img {
      opacity: 0.5;
    }
    .build-button:disabled .build-cost {
      color: #ff4444;
    }
    .build-icon {
      font-size: 40px;
      margin-bottom: 5px;
    }
    .build-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
      text-align: center;
    }
    .build-cost {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      font-size: 14px;
      line-height: 1.15;
      font-variant-numeric: tabular-nums;
    }
    .build-cost-label {
      color: #cbd5e1;
      font-size: 10px;
      font-weight: 600;
      opacity: 0.9;
    }
    .build-cost-value {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      white-space: nowrap;
    }
    .build-loading {
      padding: 20px;
      color: #cbd5e1;
      font-size: 13px;
    }
    .hidden {
      display: none !important;
    }
    .build-count-chip {
      position: absolute;
      top: -10px;
      right: -10px;
      background-color: #2c2c2c;
      color: white;
      padding: 2px 10px;
      border-radius: 10000px;
      transition: all 0.3s ease;
      font-size: 12px;
      display: flex;
      justify-content: center;
      align-content: center;
      border: 1px solid #444;
    }
    .build-button:not(:disabled):hover > .build-count-chip {
      background-color: #3a3a3a;
      border-color: #666;
    }
    .build-button:not(:disabled):active > .build-count-chip {
      background-color: #4a4a4a;
    }
    .build-button:disabled > .build-count-chip {
      background-color: #1a1a1a;
      border-color: #333;
      cursor: not-allowed;
    }
    .build-count {
      font-weight: bold;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .build-menu {
        width: min(92vw, 680px);
        padding: 10px;
        max-height: min(88dvh, 760px);
        overscroll-behavior: contain;
      }
      .build-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .build-button {
        width: 100%;
        min-width: 0;
        min-height: 124px;
        height: auto;
        margin: 0;
        padding: 8px 6px;
        gap: 5px;
        touch-action: manipulation;
      }
      .build-icon {
        font-size: 28px;
      }
      .build-name {
        font-size: 12px;
        margin-bottom: 2px;
        overflow-wrap: anywhere;
      }
      .build-description {
        font-size: 10px;
        line-height: 1.25;
      }
      .build-cost {
        font-size: 12px;
      }
      .build-cost-label {
        font-size: 9px;
      }
      .build-count {
        font-size: 10px;
      }
      .build-count-chip {
        padding: 1px 5px;
      }
    }

    @media (max-width: 480px) {
      .build-menu {
        width: min(94vw, 520px);
        padding: 9px;
        max-height: min(86dvh, 720px);
      }
      .build-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
      }
      .build-button {
        min-height: 126px;
        padding: 8px 5px;
        border-width: 1px;
      }
      .build-icon {
        font-size: 24px;
      }
      .build-name {
        font-size: 12px;
      }
      .build-description {
        font-size: 9px;
      }
      .build-cost {
        font-size: 12px;
      }
      .build-count {
        font-size: 10px;
      }
      .build-button img {
        width: 24px;
        height: 24px;
      }
      .build-cost img {
        width: 12px;
        height: 12px;
      }
    }

    @media (pointer: coarse) {
      .build-button:not(:disabled):hover {
        transform: none;
      }
      .build-button:not(:disabled):active {
        transform: none;
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
    const buildableUnit = this.playerBuildables?.find(
      (unit) => unit.type === item.unitType,
    );
    if (!buildableUnit) return 0n;

    // When the click upgrades an existing structure, show the next actual
    // upgrade cost rather than the general new-build cost.
    if (buildableUnit.canUpgrade !== false && !this.uiState.preventStacking) {
      return buildableUnit.upgradeCosts?.[0] ?? buildableUnit.cost;
    }
    return buildableUnit.cost;
  }

  public costLabel(item: BuildItemDisplay): string {
    const buildableUnit = this.playerBuildables?.find(
      (unit) => unit.type === item.unitType,
    );
    const isUpgrade =
      buildableUnit !== undefined &&
      buildableUnit.canUpgrade !== false &&
      !this.uiState.preventStacking;
    return translateText(
      isUpgrade ? "build_menu.upgrade_cost_label" : "build_menu.cost_label",
    );
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
        ${
          this.playerBuildables === null
            ? html`<div class="build-loading">
                ${translateText("build_menu.loading")}
              </div>`
            : this.filteredBuildTable.map(
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
                            this.sendBuildOrUpgrade(
                              buildableUnit,
                              this.clickedTile,
                            )}
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
                              item.description &&
                              translateText(item.description)
                            }</span
                          >
                          <span class="build-cost">
                            <span class="build-cost-label"
                              >${this.costLabel(item)}</span
                            >
                            <span class="build-cost-value" translate="no">
                              ${renderNumber(
                                this.game && this.game.myPlayer()
                                  ? this.cost(item)
                                  : 0,
                              )}
                              <img
                                src=${goldCoinIcon}
                                alt="gold"
                                width="12"
                                height="12"
                                class="align-middle"
                              />
                            </span>
                          </span>
                          ${
                            item.countable
                              ? html`<div class="build-count-chip">
                                  <span class="build-count"
                                    >${this.count(item)}</span
                                  >
                                </div>`
                              : ""
                          }
                        </button>
                      `;
                    })}
                  </div>
                `,
              )
        }
      </div>
    `;
  }

  hideMenu() {
    this._hidden = true;
    this.refreshRequestId++;
    this.requestUpdate();
  }

  showMenu(clickedTile: TileRef) {
    this.clickedTile = clickedTile;
    this._hidden = false;
    void this.refresh();
  }

  private refresh() {
    const requestId = ++this.refreshRequestId;
    const refresh = this.game
      .myPlayer()
      ?.buildables(this.clickedTile, BuildMenus.types)
      .then((buildables) => {
        if (requestId !== this.refreshRequestId) return;
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
