import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTasks, transitionTask } from "./api";
import { TaskFilters } from "./TaskFilters";
import { TaskTable } from "./TaskTable";
import type { TaskFilters as Filters } from "./types";

afterEach(() => vi.unstubAllGlobals());

const filters: Filters = {
  page: 2,
  pageSize: 20,
  scope: "all",
  search: "Blue",
  status: "open",
  priority: "high",
  assignedUserId: "usr-cs-001",
  assignedRole: "customer_service",
  taskType: "FOLLOW_UP_CALL",
  customerId: "cus-002",
  due: "overdue",
  sort: "due_at",
  direction: "asc"
};

describe("Tasks frontend", () => {
  it("sends all operational filters and accepts paginated results", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        json({ ok: true, data: [], pagination: { page: 2, pageSize: 20, total: 0, totalPages: 0 } })
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchTasks(filters)).resolves.toMatchObject({
      items: [],
      pagination: { page: 2 }
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("search=Blue");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("due=overdue");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("assignedRole=customer_service");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "same-origin" });
  });

  it("uses structured write actions through the shared API client", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ ok: true, data: { task: { id: "tsk-1" }, duplicate: false } }));
    vi.stubGlobal("fetch", fetchMock);
    await transitionTask("tsk-1", "complete");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/tasks/tsk-1/complete");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "same-origin"
    });
  });

  it("preserves structured task errors for localized UI handling", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "TASK_STATE_INVALID", message: "Invalid transition." }
          }),
          { status: 409, headers: { "content-type": "application/json" } }
        )
      )
    );

    await expect(transitionTask("tsk-1", "complete")).rejects.toMatchObject({
      code: "TASK_STATE_INVALID",
      status: 409
    });
  });

  it("renders Slovak task filters while preserving controlled codes", () => {
    const markup = renderToStaticMarkup(
      <TaskFilters
        filters={filters}
        users={[]}
        customers={[]}
        canViewAll
        onChange={() => undefined}
      />
    );
    expect(markup).toContain("Všetky úlohy");
    expect(markup).toContain("Úlohy na dnes");
    expect(markup).toContain("Všetky tímy");
    expect(markup).toContain("Vzostupne");
    expect(markup).toContain('value="FOLLOW_UP_CALL"');
    expect(markup).toContain("Follow-up hovor");
  });

  it("renders a localized empty state", () => {
    const markup = renderToStaticMarkup(
      <TaskTable
        items={[]}
        canWrite
        onOpen={() => undefined}
        onTransition={() => undefined}
        onOpenCustomer={() => undefined}
      />
    );
    expect(markup).toContain("Nenašli sa žiadne úlohy");
    expect(markup).toContain("Vybraným filtrom nezodpovedajú žiadne úlohy");
  });
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
