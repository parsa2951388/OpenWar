import "dotenv/config";
import { configureRenderEnvironment } from "../src/server/RenderEnvironment";

// Configure before importing Server.ts: ServerEnv parses GAME_ENV at module
// initialization, and dotenv values must be available before that happens.
configureRenderEnvironment(process.env);

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

await import("../src/server/Server");

if (registry && clusterIdentity) {
  // The server starts its normal cluster check-in loop during module
  // initialization. Publish only after that process is running, then verify
  // the public registry shows this exact commit as an open server.
  await registry.publishAndVerifyRenderCluster(clusterIdentity);
  console.info("Render cluster is open and ready to receive games");
}
