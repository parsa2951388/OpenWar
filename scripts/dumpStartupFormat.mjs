import { readFileSync } from "node:fs";

const files = [
  "src/client/WorkerClient.ts",
  "src/client/ClientGameRunner.ts",
  "src/client/GameStartingModal.ts",
  "packages/shared/src/FetchGameMapLoader.ts",
  "src/client/render/gl/passes/name-pass/AtlasData.ts",
  "src/client/render/gl/utils/Dpr.ts",
  "tests/CloudflareApiGateway.test.ts",
  "tests/FetchGameMapLoader.test.ts",
  "tests/client/GameStartingModal.test.ts",
  "tests/client/render/gl/AtlasData.test.ts",
  "tests/client/render/gl/Dpr.test.ts",
  "tests/core/game/FetchGameMapLoader.test.ts",
  "tests/core/worker/WorkerClientInit.test.ts",
];

for (const file of files) {
  console.log(`---FORMATTED_FILE_BEGIN ${file}---`);
  console.log(readFileSync(file, "utf8"));
  console.log(`---FORMATTED_FILE_END ${file}---`);
}
