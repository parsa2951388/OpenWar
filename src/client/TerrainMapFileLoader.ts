import { GameMapSize, GameMapType } from "@openfront/engine-api/game/GameTypes";
import { MapManifest } from "@openfront/engine-api/game/MapManifest";
import {
  loadTerrainMap,
  TerrainMapData,
} from "@openfront/engine-lib/game/TerrainMapLoader";
import { assetUrl } from "@openfront/shared/AssetUrls";
import { FetchGameMapLoader } from "@openfront/shared/FetchGameMapLoader";
import { loadMapFiles } from "@openfront/shared/GameMapLoader";

export const terrainMapFileLoader = new FetchGameMapLoader((path) =>
  assetUrl(`maps/${path}`),
);

const terrainMaps = new Map<string, TerrainMapData>();
// Share an in-flight map build between callers (lobby preview, game start, replay).
const terrainMapLoads = new Map<string, Promise<TerrainMapData>>();
const manifests = new Map<GameMapType, Promise<MapManifest>>();

/** A map's manifest, fetched once. */
export function loadCachedManifest(map: GameMapType): Promise<MapManifest> {
  let manifest = manifests.get(map);
  if (manifest === undefined) {
    manifest = terrainMapFileLoader.getMapData(map).manifest();
    manifest.catch(() => manifests.delete(map));
    manifests.set(map, manifest);
  }
  return manifest;
}

/** The maps the client draws on, built once per map and size. */
export function loadCachedTerrainMap(
  map: GameMapType,
  mapSize: GameMapSize,
): Promise<TerrainMapData> {
  const key = `${map}:${mapSize}`;
  const cached = terrainMaps.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  const inFlight = terrainMapLoads.get(key);
  if (inFlight !== undefined) return inFlight;

  const load = Promise.resolve().then(async () => {
    const terrain = await loadTerrainMap(
      await loadMapFiles(terrainMapFileLoader, map, mapSize),
    );
    terrainMaps.set(key, terrain);
    return terrain;
  });
  terrainMapLoads.set(key, load);

  // Keep only completed terrain data; remove the in-flight entry on both
  // success and failure. A failed fetch can then be retried by the next join.
  void load.then(
    () => {
      if (terrainMapLoads.get(key) === load) terrainMapLoads.delete(key);
    },
    () => {
      if (terrainMapLoads.get(key) === load) terrainMapLoads.delete(key);
    },
  );

  return load;
}
