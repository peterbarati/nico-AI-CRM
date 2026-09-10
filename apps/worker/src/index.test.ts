import { describe, expect, it } from "vitest";
import { createHealthResponse } from "./index";

describe("createHealthResponse", () => {
  it("reports the API health in mock mode", () => {
    expect(createHealthResponse()).toMatchObject({
      ok: true,
      service: "nico-ai-crm-api",
      mode: "mock"
    });
  });
});
