import compression from "compression";

/**
 * Compress full-resolution map binaries. They are packed terrain data and are
 * served as application/octet-stream, which the default compression filter
 * intentionally excludes. Browsers advertise gzip and transparently decode
 * the response before fetch().arrayBuffer(), so the game wire format is
 * unchanged while slow mobile connections transfer substantially fewer bytes.
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
