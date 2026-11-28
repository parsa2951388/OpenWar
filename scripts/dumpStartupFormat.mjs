import { readFileSync } from "node:fs";

const files = [
  "src/client/ClientGameRunner.ts",
  "src/client/WorkerClient.ts",
  "tests/client/GameStartingModal.test.ts",
  "tests/client/render/gl/AtlasData.test.ts",
  "tests/client/render/gl/Dpr.test.ts",
];

for (const file of files) {
  console.log(`---FORMATTED_FILE_BEGIN ${file}---`);
  console.log(readFileSync(file, "utf8"));
  console.log(`---FORMATTED_FILE_END ${file}---`);
}
