import {
  createDatabaseContext,
  getCustomerFilterOptions,
  getCustomerOverview,
  listCustomerInteractions,
  listCustomerOrders,
  listCustomers,
  listCustomerTasks,
  listCustomerVisits,
  listSegments,
  listTasks,
  type CustomerListQuery,
  type CustomerSortField,
  type PaginationInput,
  type SortDirection
} from "@nico-ai-crm/db";
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

function ok<T>(data: T, init?: ResponseInit): Response {
  return jsonResponse({ ok: true, data }, init);
}

function notFound(message = "Not found"): Response {
  return jsonResponse({ ok: false, error: { code: "NOT_FOUND", message } }, { status: 404 });
}

function badRequest(message: string): Response {
  return jsonResponse({ ok: false, error: { code: "BAD_REQUEST", message } }, { status: 400 });
}

function internalError(): Response {
  return jsonResponse(
    { ok: false, error: { code: "INTERNAL_ERROR", message: "Unexpected API error." } },
    { status: 500 }
  );
}

function parsePagination(url: URL): PaginationInput {
  return {
    page: parsePositiveInt(url.searchParams.get("page")),
    pageSize: parsePositiveInt(url.searchParams.get("pageSize"))
  };
}

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : undefined;
}

function parseCustomerListQuery(url: URL): CustomerListQuery {
  const activeParam = url.searchParams.get("active");
  const sortParam = url.searchParams.get("sort");
  const directionParam = url.searchParams.get("direction");

  return {
    ...parsePagination(url),
    search: url.searchParams.get("search") ?? undefined,
    assignedSalesRepId: url.searchParams.get("assignedSalesRepId") ?? undefined,
    b2bStatus: url.searchParams.get("b2bStatus") ?? undefined,
    segmentCode: url.searchParams.get("segmentCode") ?? undefined,
    active:
      activeParam === null
        ? undefined
        : activeParam === "true" || activeParam === "1"
          ? true
          : activeParam === "false" || activeParam === "0"
            ? false
            : undefined,
    sort: isCustomerSortField(sortParam) ? sortParam : undefined,
    direction: isSortDirection(directionParam) ? directionParam : undefined
  };
}

function isCustomerSortField(value: string | null): value is CustomerSortField {
  return (
    value === "company_name" ||
    value === "city" ||
    value === "updated_at" ||
    value === "last_order_date" ||
    value === "turnover_90d" ||
    value === "days_since_last_order"
  );
}

function isSortDirection(value: string | null): value is SortDirection {
  return value === "asc" || value === "desc";
}

export function createHealthResponse(): HealthResponse {
  return {
    ok: true,
    service: "nico-ai-crm-api",
    mode: "mock",
    timestamp: new Date().toISOString()
  };
}

async function handleApiRequest(request: Request, env: Env, url: URL): Promise<Response> {
  const context = createDatabaseContext(env.DB);

  if (url.pathname === "/api/health") {
    return jsonResponse(createHealthResponse());
  }

  if (request.method !== "GET") {
    return badRequest("Only read-only GET API endpoints are available in this phase.");
  }

  if (url.pathname === "/api/customers") {
    const result = await listCustomers(context, parseCustomerListQuery(url));
    return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
  }

  if (url.pathname === "/api/customers/filters") {
    return ok(await getCustomerFilterOptions(context));
  }

  if (url.pathname === "/api/segments") {
    return ok(await listSegments(context));
  }

  if (url.pathname === "/api/tasks") {
    const result = await listTasks(context, {
      ...parsePagination(url),
      status: url.searchParams.get("status") ?? undefined
    });
    return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
  }

  const customerRoute = url.pathname.match(
    /^\/api\/customers\/([^/]+)(?:\/(orders|interactions|tasks|visits))?$/
  );

  if (customerRoute) {
    const customerId = decodeURIComponent(customerRoute[1]);
    const childRoute = customerRoute[2];

    if (!childRoute) {
      const overview = await getCustomerOverview(context, customerId);
      return overview ? ok(overview) : notFound("Customer not found.");
    }

    if (childRoute === "orders") {
      const result = await listCustomerOrders(context, customerId, parsePagination(url));
      return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
    }

    if (childRoute === "interactions") {
      const result = await listCustomerInteractions(context, customerId, parsePagination(url));
      return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
    }

    if (childRoute === "tasks") {
      const result = await listCustomerTasks(context, customerId, {
        ...parsePagination(url),
        status: url.searchParams.get("status") ?? undefined
      });
      return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
    }

    if (childRoute === "visits") {
      const result = await listCustomerVisits(context, customerId, parsePagination(url));
      return jsonResponse({ ok: true, data: result.items, pagination: result.pagination });
    }
  }

  return notFound();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApiRequest(request, env, url);
      } catch (error) {
        console.error(error);
        return internalError();
      }
    }

    return env.ASSETS.fetch(request);
  }
};
