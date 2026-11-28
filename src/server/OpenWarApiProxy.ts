export interface OpenWarApiProxyRequest {
  method: string;
  pathname: string;
  search: string;
  host: string;
  origin?: string;
  headers: Headers;
  body?: unknown;
}

export async function forwardOpenWarApiRequest(
  _request: OpenWarApiProxyRequest,
  _fetcher: typeof fetch = fetch,
): Promise<Response | null> {
  return null;
}
