import compression from "compression";

/**
 * Explicitly compress hashed full-resolution map binaries served as
 * application/octet-stream. Browsers transparently decode gzip before
 * fetch().arrayBuffer(), preserving the exact map bytes while reducing
 * transfer size on slow connections. Other opaque binaries stay uncompressed,
 * while normal text assets retain the default compression behavior.
 */
export function createMapAssetCompressionMiddleware() {
  return compression({
    threshold: 1024,
    filter: (request, response) => {
      const isFullMapBinary =
        request.method === "GET" &&
        /^\/_assets\/maps\/[^/]+\/map\.[a-f0-9]{12}\.bin$/.test(request.path);
      if (isFullMapBinary) return true;

      // Preserve ordinary compression for text assets, but do not compress
      // unrelated opaque binary payloads just because they use octet-stream.
      const contentType = String(
        response.getHeader("Content-Type") ?? "",
      ).toLowerCase();
      if (contentType.startsWith("application/octet-stream")) return false;

      return compression.filter(request, response);
    },
  });
}
