import { useEffect, useMemo, useState } from "react";
import type { CustomerListItem, UserReference } from "../customers/types";
import { PaginationControls } from "../customers/PaginationControls";
import { useAuth } from "../auth/AuthContext";
import { apiErrorMessage, t } from "../../i18n";
import { fetchAssignableUsers, fetchTaskCustomers, fetchTasks, transitionTask } from "./api";
import { TaskDetailDrawer } from "./TaskDetailDrawer";
import { TaskFilters } from "./TaskFilters";
import { TaskFormModal } from "./TaskFormModal";
import { TaskTable } from "./TaskTable";
import type { OperationalTask, TaskFilters as Filters } from "./types";

export function TasksPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { actor } = useAuth();
  const canViewAll = actor.role === "admin" || actor.role === "manager";
  const canWrite = actor.permissions.includes("TASK_WRITE");
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    pageSize: 20,
    scope: canViewAll ? "all" : "mine",
    search: "",
    status: "",
    priority: "",
    assignedUserId: "",
    assignedRole: "",
    taskType: "",
    customerId: "",
    due: "all",
    sort: "operational",
    direction: "asc"
  });
  const [items, setItems] = useState<OperationalTask[]>([]);
  const [pagination, setPagination] = useState<
    Awaited<ReturnType<typeof fetchTasks>>["pagination"] | null
  >(null);
  const [users, setUsers] = useState<UserReference[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchAssignableUsers(), fetchTaskCustomers()])
      .then(([availableUsers, availableCustomers]) => {
        if (!mounted) return;
        const scopedUsers =
          actor.role === "customer_service"
            ? availableUsers.filter((user) => user.role === "customer_service")
            : actor.role === "sales_rep"
              ? availableUsers.filter((user) => user.id === actor.id)
              : availableUsers;
        setUsers(
          scopedUsers.some((user) => user.id === actor.id)
            ? scopedUsers
            : [
                { id: actor.id, name: actor.name, email: actor.email, role: actor.role },
                ...scopedUsers
              ]
        );
        setCustomers(availableCustomers);
      })
      .catch(
        (reason: unknown) =>
          mounted && setError(apiErrorMessage(reason, "Filtre úloh momentálne nie sú dostupné."))
      );
    return () => {
      mounted = false;
    };
  }, [actor]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchTasks(filters)
      .then((result) => {
        if (mounted) {
          setItems(result.items);
          setPagination(result.pagination);
        }
      })
      .catch(
        (reason: unknown) =>
          mounted && setError(apiErrorMessage(reason, "Úlohy momentálne nie sú dostupné."))
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [filters, revision]);

  const visibleUsers = useMemo(() => users, [users]);
  const updateFilter = (key: keyof Filters, value: string) =>
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: 1,
      ...(key === "scope" ? { assignedUserId: "", assignedRole: "" } : {})
    }));

  async function applyTransition(task: OperationalTask, action: "start" | "complete" | "cancel") {
    setError(null);
    try {
      await transitionTask(task.id, action);
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(apiErrorMessage(reason, "Stav úlohy sa nepodarilo zmeniť."));
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("Tasks")}</p>
          <h2>{canViewAll && filters.scope === "all" ? t("All tasks") : t("My tasks")}</h2>
        </div>
        <div className="page-heading-actions">
          <p>{t("Operational queue for follow-ups, handoffs, visits, and manual work.")}</p>
          {canWrite ? (
            <button type="button" onClick={() => setCreating(true)}>
              {t("Add task")}
            </button>
          ) : null}
        </div>
      </div>
      <TaskFilters
        filters={filters}
        users={visibleUsers}
        customers={customers}
        canViewAll={canViewAll}
        onChange={updateFilter}
      />
      {loading ? <div className="loading-state">{t("Loading tasks...")}</div> : null}
      {error ? (
        <section className="error-state">
          <h3>{t("Tasks unavailable")}</h3>
          <p>{error}</p>
        </section>
      ) : null}
      {!loading && !error ? (
        <>
          <TaskTable
            items={items}
            canWrite={canWrite}
            onOpen={setSelectedTaskId}
            onTransition={(task, action) => void applyTransition(task, action)}
            onOpenCustomer={(customerId) => onNavigate(`/customers/${customerId}`)}
          />
          <PaginationControls
            pagination={pagination}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </>
      ) : null}
      {creating ? (
        <TaskFormModal
          users={visibleUsers}
          customers={customers}
          defaultAssigneeId={actor.id}
          onClose={() => setCreating(false)}
          onCreated={() => setRevision((value) => value + 1)}
        />
      ) : null}
      {selectedTaskId ? (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          users={visibleUsers}
          canWrite={canWrite}
          onClose={() => setSelectedTaskId(null)}
          onChanged={() => setRevision((value) => value + 1)}
          onOpenCustomer={(customerId) => onNavigate(`/customers/${customerId}`)}
        />
      ) : null}
    </section>
  );
}
