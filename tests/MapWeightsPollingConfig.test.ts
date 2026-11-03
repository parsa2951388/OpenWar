import { afterEach, describe, expect, it } from "vitest";
import { ServerEnv } from "../src/server/ServerEnv";

const original = process.env.MAP_WEIGHTS_API_ENABLED;

afterEach(() => {
  if (original === undefined) {
    delete process.env.MAP_WEIGHTS_API_ENABLED;
  } else {
    process.env.MAP_WEIGHTS_API_ENABLED = original;
  }
});

describe("map weights API polling configuration", () => {
  it("defaults to enabled for upstream-compatible deployments", () => {
    delete process.env.MAP_WEIGHTS_API_ENABLED;
    expect(ServerEnv.mapWeightsApiEnabled()).toBe(true);
  });

  it("can be disabled explicitly for a standalone deployment", () => {
    process.env.MAP_WEIGHTS_API_ENABLED = "false";
    expect(ServerEnv.mapWeightsApiEnabled()).toBe(false);
  });

  it("does not disable polling for values other than the explicit false string", () => {
    process.env.MAP_WEIGHTS_API_ENABLED = "0";
    expect(ServerEnv.mapWeightsApiEnabled()).toBe(true);
    process.env.MAP_WEIGHTS_API_ENABLED = "true";
    expect(ServerEnv.mapWeightsApiEnabled()).toBe(true);
  });
});
