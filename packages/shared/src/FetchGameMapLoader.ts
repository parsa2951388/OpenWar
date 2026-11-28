import {
  CustomGameMap,
  GameMapId,
  GameMapType,
} from "@openfront/engine-api/game/GameTypes";
import { MapFiles } from "@openfront/engine-api/game/MapFiles";
import { GameMapLoader, MapData } from "./GameMapLoader";

const MAP_ASSET_TIMEOUT_MS = 45_000;

export class FetchGameMapLoader implements GameMapLoader {
  private maps: Map<GameMapId, MapData>;
  private custom: MapData | null = null;

  public constructor(
    private readonly pathResolver: string | ((path: string) => string),
  ) {
    this.maps = new Map<GameMapId, MapData>();
  }

  /**
   * Answers for the Custom map from a loaded scenario bundle's files and
   * thumbnail (docs/ScenarioEditor.md, "Custom map identity"), until the
   * next bundle. Each load gets its own copy of a file: a game takes over
   * the files it loads, and a worker is sent them by transfer.
   */
  public setCustomMap(files: MapFiles, webpPath: string): void {
    const copy = (bin: Uint8Array | undefined) => async () => {
      if (bin === undefined) throw new Error("the scenario lacks a map file");
      return bin.slice();
    };
    this.custom = {
      mapBin: copy(files.mapBin),
      map4xBin: copy(files.map4xBin),
      map16xBin: copy(files.map16xBin),
      manifest: async () => structuredClone(files.manifest),
      webpPath,
      layerImage: async () => {
        throw new Error("a scenario's map has no layers");
      },
    };
  }

  public getMapData(map: GameMapId): MapData {
    if (map === CustomGameMap) {
      if (this.custom === null) throw new Error("no scenario is loaded");
      return this.custom;
    }
    const cachedMap = this.maps.get(map);
    if (cachedMap) {
      return cachedMap;
    }

    const key = Object.keys(GameMapType).find(
      (k) => GameMapType[k as keyof typeof GameMapType] === map,
    );
    const fileName = key?.toLowerCase();

    if (!fileName) {
      throw new Error(`Unknown map: ${map}`);
    }

    const mapData = {
      mapBin: () => this.loadBinaryFromUrl(this.url(fileName, "map.bin")),
      map4xBin: () => this.loadBinaryFromUrl(this.url(fileName, "map4x.bin")),
      map16xBin: () => this.loadBinaryFromUrl(this.url(fileName, "map16x.bin")),
      manifest: () => this.loadJsonFromUrl(this.url(fileName, "manifest.json")),
      webpPath: this.url(fileName, "thumbnail.webp"),
      layerImage: (layerId: string, compact: boolean) =>
        this.loadImageBitmap(
          this.url(fileName, `${layerId}${compact ? ".4x" : ""}.webp`),
        ),
    } satisfies MapData;

    this.maps.set(map, mapData);
    return mapData;
  }

  private resolveUrl(path: string): string {
    if (typeof this.pathResolver === "function") {
      return this.pathResolver(path);
    }
    return `${this.pathResolver}/${path}`;
  }

  private url(map: string, path: string) {
    return this.resolveUrl(`${map}/${path}`);
  }

  private async fetchAsset<T>(
    url: string,
    consume: (response: Response) => Promise<T>,
  ): Promise<T> {
    const signal = AbortSignal.timeout(MAP_ASSET_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.statusText}`);
      }
      // Keep the timeout active while the response body is being consumed too.
      return await consume(response);
    } catch (error) {
      if (signal.aborted) {
        throw new Error(
          `Timed out loading game asset after ${MAP_ASSET_TIMEOUT_MS} ms: ${url}`,
        );
      }
      throw error;
    }
  }

  private async loadBinaryFromUrl(url: string) {
    const startTime = performance.now();
    const data = await this.fetchAsset(url, async (response) =>
      response.arrayBuffer(),
    );
    console.log(
      `[MapLoader] ${url}: ${(performance.now() - startTime).toFixed(0)}ms`,
    );
    return new Uint8Array(data);
  }

  private async loadJsonFromUrl(url: string) {
    return this.fetchAsset(url, (response) => response.json());
  }

  private async loadImageBitmap(url: string): Promise<ImageBitmap> {
    const startTime = performance.now();
    const blob = await this.fetchAsset(url, (response) => response.blob());
    const bitmap = await createImageBitmap(blob);
    console.log(
      `[MapLoader] ${url}: ${(performance.now() - startTime).toFixed(0)}ms`,
    );
    return bitmap;
  }
}
