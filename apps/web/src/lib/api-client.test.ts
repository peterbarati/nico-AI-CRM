import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, requestApiData } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

describe("shared frontend API client", () => {
  it("sends same-origin credentials with authenticated requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ ok: true, data: { value: 1 } }));
    vi.stubGlobal("fetch", fetchMock);
    await requestApiData("/api/example");
    expect(fetchMock).toHaveBeenCalledWith("/api/example", { credentials: "same-origin" });
  });

  it.each([
    [401, "UNAUTHENTICATED", "Authentication required."],
    [403, "FORBIDDEN", "Access denied."],
    [500, "INTERNAL_ERROR", "Request failed."]
  ])("preserves structured %s errors", async (status, code, message) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json({ ok: false, error: { code, message } }, status))
    );
    await expect(requestApiData("/api/example")).rejects.toMatchObject({
      code,
      message,
      status
    });
  });

  it("normalizes transport and non-JSON failures without exposing fetch internals", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")));
    await expect(requestApiData("/api/example")).rejects.toMatchObject({
      code: "API_UNAVAILABLE",
      message: "The CRM service is unavailable. Please try again."
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("upstream failed", { status: 502 }))
    );
    await expect(requestApiData("/api/example")).rejects.toMatchObject({
      code: "API_UNAVAILABLE",
      status: 502
    });
  });

  it("rejects malformed JSON success envelopes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ ok: true })));
    await expect(requestApiData("/api/example")).rejects.toBeInstanceOf(ApiClientError);
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
