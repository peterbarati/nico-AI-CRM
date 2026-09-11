import { useEffect, useState } from "react";
import { PaginationControls } from "../customers/PaginationControls";
import type { UserReference } from "../customers/types";
import { fetchSalesTasks, fetchSalesUsers } from "./api";
import { SalesQueueTable } from "./SalesQueueTable";
import { SalesTaskPanel } from "./SalesTaskPanel";
import type { SalesTask, SalesTaskFilters } from "./types";

const initialFilters: SalesTaskFilters = {
  page: 1,
  pageSize: 20,
  assignedUserId: "",
  status: "",
  priority: "",
  due: ""
};

export function SalesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [items, setItems] = useState<SalesTask[]>([]);
  const [pagination, setPagination] = useState<
    Awaited<ReturnType<typeof fetchSalesTasks>>["pagination"] | null
  >(null);
  const [filters, setFilters] = useState(initialFilters);
  const [users, setUsers] = useState<UserReference[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchSalesTasks(filters)
      .then((data) => {
        if (mounted) {
          setItems(data.items);
          setPagination(data.pagination);
        }
      })
      .catch(
        (error: unknown) =>
          mounted && setError(error instanceof Error ? error.message : "Sales queue unavailable.")
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [filters, revision]);

  useEffect(() => {
    void fetchSalesUsers().then(setUsers);
  }, []);
  const updateFilter = (key: keyof SalesTaskFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales</p>
          <h2>Sales work queue</h2>
        </div>
        <p>Assigned tasks, visit lifecycle, and Customer Service handoff context.</p>
      </div>
      <section className="filter-panel" aria-label="Sales task filters">
        <label>
          Assigned
          <select
            value={filters.assignedUserId}
            onChange={(event) => updateFilter("assignedUserId", event.target.value)}
          >
            <option value="">All Sales reps</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
          >
            <option value="">Actionable</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Priority
          <select
            value={filters.priority}
            onChange={(event) => updateFilter("priority", event.target.value)}
          >
            <option value="">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>
          Due
          <select value={filters.due} onChange={(event) => updateFilter("due", event.target.value)}>
            <option value="">Any date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </label>
      </section>
      {loading ? <div className="loading-state">Loading Sales work queue...</div> : null}
      {error ? (
        <section className="error-state">
          <h2>Sales queue unavailable</h2>
          <p>{error}</p>
        </section>
      ) : null}
      {!loading && !error ? (
        <>
          <SalesQueueTable items={items} onOpenTask={setSelectedTaskId} />
          <PaginationControls
            pagination={pagination}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </>
      ) : null}
      {selectedTaskId ? (
        <SalesTaskPanel
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onChanged={() => setRevision((value) => value + 1)}
          onOpenCustomer={(customerId) => onNavigate(`/customers/${customerId}`)}
        />
      ) : null}
    </section>
  );
}
