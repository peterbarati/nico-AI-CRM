import type { HealthResponse } from "@nico-ai-crm/shared";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV?: string;
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8"
};

function jsonResponse<T>(body: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...init?.headers
    }
  });
}

export function createHealthResponse(): HealthResponse {
  return {
    ok: true,
    service: "nico-ai-crm-api",
    mode: "mock",
    timestamp: new Date().toISOString()
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return jsonResponse(createHealthResponse());
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ ok: false, error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};
