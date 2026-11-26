export interface OpenWarGatewayContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface OpenWarGatewayEnvironment {
  ALLOWED_ORIGINS?: string;
  EVENTS_DB?: {
    prepare(query: string): {
      bind(...values: unknown[]): {
        run(): Promise<unknown>;
        first(): Promise<unknown>;
      };
    };
  };
}

declare const gateway: {
  fetch(
    request: Request,
    env: OpenWarGatewayEnvironment,
    context: OpenWarGatewayContext,
  ): Promise<Response>;
};

export default gateway;
