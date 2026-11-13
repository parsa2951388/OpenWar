import { beforeEach, describe, expect, it, vi } from "vitest";

import { GameMapSize, GameMapType } from "@openfront/engine-api/game/GameTypes";
import type { MapLayer } from "@openfront/engine-api/game/MapFiles";
import type { TerrainMapData } from "@openfront/engine-lib/game/TerrainMapLoader";
import type { GameMapLoader } from "@openfront/shared/GameMapLoader";
import { MapLayerController } from "../../src/client/controllers/MapLayerController";
import type { MapRenderer } from "../../src/client/render/gl";
import { MAP_LAYERS_KEY, UserSettings } from "../../src/client/UserSettings";

const LAYERS: MapLayer[] = [
  { id: "forest", placement: "land", nukeable: true, alpha: 0.8 },
  { id: "reef", placement: "water" },
];

/** Start the controller on a map with LAYERS and record what it tells the renderer. */
async function startGame() {
  const visibility: [string, boolean][] = [];
  const alphas: [string, number][] = [];
  const view = {
    setMapLayers: () => {},
    setLayerVisible: (id: string, visible: boolean) =>
      visibility.push([id, visible]),
    setLayerAlpha: (id: string, alpha: number) => alphas.push([id, alpha]),
  } as unknown as MapRenderer;
  const loader = {
    getMapData: () => ({ layerImage: async () => ({}) as ImageBitmap }),
  } as unknown as GameMapLoader;
  new MapLayerController(
    view,
    { layers: LAYERS } as TerrainMapData,
    new UserSettings(),
    GameMapType.Ommatrypta,
    GameMapSize.Normal,
    loader,
    new AbortController().signal,
  ).init();
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { visibility, alphas };
}

describe("MapLayerController", () => {
  beforeEach(() => {
    localStorage.clear();
    const settings = new UserSettings();
    settings.setGraphicsOverrides({});
    settings.removeCached(MAP_LAYERS_KEY);
  });

  it("applies each layer's stored state once the images load", async () => {
    new UserSettings().setGraphicsOverrides({
      mapLayerVisibility: { forest: false },
      mapLayerAlpha: { reef: 0.3 },
    });

    const { visibility, alphas } = await startGame();

    expect(visibility).toEqual([
      ["forest", false],
      ["reef", true],
    ]);
    expect(alphas).toEqual([
      ["forest", 0.8],
      ["reef", 0.3],
    ]);
  });

  it("closes decoded layer images when the game is aborted before they arrive", async () => {
    let resolveImage: (image: ImageBitmap) => void = () => {
      throw new Error("image request was not started");
    };
    const pendingImage = new Promise<ImageBitmap>((resolve) => {
      resolveImage = resolve;
    });
    const image = { close: vi.fn() } as unknown as ImageBitmap;
    const view = {
      setMapLayers: vi.fn(),
      setLayerVisible: vi.fn(),
      setLayerAlpha: vi.fn(),
    } as unknown as MapRenderer;
    const abortController = new AbortController();
    const loader = {
      getMapData: () => ({ layerImage: () => pendingImage }),
    } as unknown as GameMapLoader;

    new MapLayerController(
      view,
      { layers: LAYERS } as TerrainMapData,
      new UserSettings(),
      GameMapType.Ommatrypta,
      GameMapSize.Normal,
      loader,
      abortController.signal,
    ).init();

    abortController.abort();
    resolveImage(image);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(view.setMapLayers).not.toHaveBeenCalled();
    // Both layer IDs may resolve to one cached ImageBitmap; close it only once.
    expect(image.close).toHaveBeenCalledOnce();
  });

  it("starts with every layer hidden when the Map Layers switch is off", async () => {
    new UserSettings().toggleMapLayers();

    const { visibility } = await startGame();

    expect(visibility).toEqual([
      ["forest", false],
      ["reef", false],
    ]);
  });
});
