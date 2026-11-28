import express from "express";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { gunzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { createMapAssetCompressionMiddleware } from "../../src/server/MapAssetCompression";

let server: http.Server | null = null;

async function get(
  port: number,
  pathname: string,
): Promise<{ headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const request = http.get(
      {
        host: "127.0.0.1",
        port,
        path: pathname,
        headers: { "accept-encoding": "gzip" },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          resolve({ headers: response.headers, body: Buffer.concat(chunks) }),
        );
      },
    );
    request.on("error", reject);
  });
}

async function start(app: express.Express): Promise<number> {
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server!.once("listening", resolve);
    server!.once("error", reject);
  });
  return (server.address() as AddressInfo).port;
}

afterEach(async () => {
  if (server !== null) {
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = null;
  }
});

describe("map asset compression", () => {
  it("gzips hashed full-map binaries and preserves the exact payload", async () => {
    const payload = Buffer.alloc(512 * 1024, 0x41);
    const app = express();
    app.use(createMapAssetCompressionMiddleware());
    app.get(
      "/_assets/maps/world/map.405ad833ad89.bin",
      (_request, response) => {
        response.type("application/octet-stream").send(payload);
      },
    );

    const port = await start(app);
    const response = await get(
      port,
      "/_assets/maps/world/map.405ad833ad89.bin",
    );

    expect(response.headers["content-encoding"]).toBe("gzip");
    expect(response.headers.vary).toContain("Accept-Encoding");
    expect(response.body.byteLength).toBeLessThan(payload.byteLength);
    expect(gunzipSync(response.body)).toEqual(payload);
  });

  it("compresses maps and text while leaving unrelated binary routes alone", async () => {
    const app = express();
    app.use(createMapAssetCompressionMiddleware());
    const textPayload = "Open War static text asset ".repeat(512);
    app.get("/assets/other.bin", (_request, response) => {
      response.type("application/octet-stream").send(Buffer.alloc(4096, 0x41));
    });
    app.get("/assets/guide.txt", (_request, response) => {
      response.type("text/plain").send(textPayload);
    });

    const port = await start(app);
    const binaryResponse = await get(port, "/assets/other.bin");
    const textResponse = await get(port, "/assets/guide.txt");

    expect(binaryResponse.headers["content-encoding"]).toBeUndefined();
    expect(textResponse.headers["content-encoding"]).toBe("gzip");
    expect(gunzipSync(textResponse.body).toString()).toBe(textPayload);
  });
});
