// Writes map-generator/info.schema.json from MapInfoSchema so editors can
// check info.json as it is typed. Run by `npm run gen-maps`.
import { MapInfoSchema } from "@openfront/engine-api/game/MapManifest";
import fs from "fs";
import path from "path";
import { z } from "zod";

export const MAP_INFO_SCHEMA_PATH = path.resolve(
  import.meta.dirname,
  "../map-generator/info.schema.json",
);

// Zod's JSON Schema tuple output changed between patch releases. Keep the
// coordinate wire format explicit: these fields are exactly [x, y], not an
// arbitrary-length array. This keeps editor validation in sync with Zod.
function enforceCoordinateTupleBounds(value: unknown): void {
  if (Array.isArray(value)) {
    for (const child of value) enforceCoordinateTupleBounds(child);
    return;
  }
  if (value === null || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (
      key === "coordinates" &&
      child !== null &&
      typeof child === "object" &&
      !Array.isArray(child)
    ) {
      const coordinateSchema = child as Record<string, unknown>;
      const prefixItems = coordinateSchema.prefixItems;
      if (
        coordinateSchema.type === "array" &&
        Array.isArray(prefixItems) &&
        prefixItems.length === 2
      ) {
        coordinateSchema.minItems = 2;
        coordinateSchema.maxItems = 2;
        coordinateSchema.items = false;
      }
    }
    enforceCoordinateTupleBounds(child);
  }
}

export function mapInfoJsonSchema(): string {
  const schema = z.toJSONSchema(MapInfoSchema, { target: "draft-2020-12" });
  enforceCoordinateTupleBounds(schema);
  return JSON.stringify(
    { ...schema, title: "OpenFront map info.json" },
    null,
    2,
  );
}

if (process.argv[1] === import.meta.filename) {
  fs.writeFileSync(MAP_INFO_SCHEMA_PATH, mapInfoJsonSchema() + "\n");
}
