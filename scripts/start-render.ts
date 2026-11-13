import "dotenv/config";
import cluster from "node:cluster";
import { fileURLToPath } from "node:url";
import { configureRenderClusterWorkerEntry } from "../src/server/RenderClusterRegistry";
import { configureRenderEnvironment } from "../src/server/RenderEnvironment";

// Configure before importing Server.ts: ServerEnv parses GAME_ENV at module
// initialization, and dotenv values must be available before that happens.
configureRenderEnvironment(process.env);

// Node cluster children default to re-executing process.argv[1], which is
// this launcher. Pin child execution to the actual server entry so workers
// never repeat registration, version publication, or launcher setup.
configureRenderClusterWorkerEntry(
  cluster,
  fileURLToPath(new URL("../src/server/Server.ts", import.meta.url)),
);

const onRender =
  process.env.RENDER === "true" && process.env.GAME_ENV !== "dev";
let clusterIdentity:
  | import("../src/server/RenderClusterRegistry").RenderClusterIdentity
  | undefined;
let registry: typeof import("../src/server/RenderClusterRegistry") | undefined;

if (onRender) {
  registry = await import("../src/server/RenderClusterRegistry");
  clusterIdentity = await registry.registerRenderCluster();
  console.info(
    `Render cluster identity acquired: ${clusterIdentity.site} / ${clusterIdentity.letter} (${clusterIdentity.numWorkers} workers)`,
  );
}

const server = await import("../src/server/Server");
await server.serverStartup;

if (registry && clusterIdentity) {
  // The server starts its normal cluster check-in loop during module
  // initialization. Publish only after that process is running, then verify
  // the public registry shows this exact commit as an open server.
  await registry.publishAndVerifyRenderCluster(clusterIdentity);
  console.info("Render cluster is open and ready to receive games");
}
