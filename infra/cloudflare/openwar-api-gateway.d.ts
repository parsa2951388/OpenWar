export interface OpenWarGatewayEnvironment {
  ALLOWED_ORIGINS?: string;
  EVENTS_DB?: {
    prepare(query: string): {
      bind(...values: unknown[]): {
        run(): Promise<unknown>;
        first(): Promise<{ failures?: number } | null>;
      };
    };
  };
}

declare const gateway: {
  fetch(
    request: Request,
    env: OpenWarGatewayEnvironment,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ): Promise<Response>;
};

export function routeGroup(pathname: string): string | null;

export default gateway;
