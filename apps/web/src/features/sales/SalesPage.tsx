import { useEffect, useState } from "react";
import { PaginationControls } from "../customers/PaginationControls";
import type { UserReference } from "../customers/types";
import { fetchSalesTasks, fetchSalesUsers } from "./api";
import { SalesQueueTable } from "./SalesQueueTable";
import { SalesTaskPanel } from "./SalesTaskPanel";
import type { SalesTask, SalesTaskFilters } from "./types";
import { apiErrorMessage, displayLabel, priorityLabel, t } from "../../i18n";

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
          mounted && setError(apiErrorMessage(error, "Obchodné úlohy momentálne nie sú dostupné."))
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
          <p className="eyebrow">{t("Sales")}</p>
          <h2>{t("Sales work queue")}</h2>
        </div>
        <p>{t("Assigned tasks, visit lifecycle, and Customer Service handoff context.")}</p>
      </div>
      <section className="filter-panel" aria-label={t("Sales task filters")}>
        <label>
          {t("Assigned")}
          <select
            value={filters.assignedUserId}
            onChange={(event) => updateFilter("assignedUserId", event.target.value)}
          >
            <option value="">{t("All Sales reps")}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Status")}
          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
          >
            <option value="">{t("Actionable")}</option>
            {(["open", "in_progress", "completed"] as const).map((value) => (
              <option key={value} value={value}>
                {displayLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Priority")}
          <select
            value={filters.priority}
            onChange={(event) => updateFilter("priority", event.target.value)}
          >
            <option value="">{t("All priorities")}</option>
            {(["urgent", "high", "normal", "low"] as const).map((value) => (
              <option key={value} value={value}>
                {priorityLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Due")}
          <select value={filters.due} onChange={(event) => updateFilter("due", event.target.value)}>
            <option value="">{t("Any date")}</option>
            <option value="overdue">{t("Overdue")}</option>
            <option value="today">{t("Today")}</option>
            <option value="upcoming">{t("Upcoming")}</option>
          </select>
        </label>
      </section>
      {loading ? <div className="loading-state">{t("Loading Sales work queue...")}</div> : null}
      {error ? (
        <section className="error-state">
          <h2>{t("Sales queue unavailable")}</h2>
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
