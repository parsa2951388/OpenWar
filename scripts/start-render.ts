import "dotenv/config";
import { configureRenderEnvironment } from "../src/server/RenderEnvironment";

// Configure before importing Server.ts: ServerEnv parses GAME_ENV at module
// initialization, and dotenv values must be available before that happens.
configureRenderEnvironment(process.env);
await import("../src/server/Server");
