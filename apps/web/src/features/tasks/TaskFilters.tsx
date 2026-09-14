import { operationalTaskTypes, taskPriorities, taskStatuses } from "@nico-ai-crm/shared";
import type { CustomerListItem, UserReference } from "../customers/types";
import { displayLabel, priorityLabel, t } from "../../i18n";
import type { TaskFilters as Filters } from "./types";

interface Props {
  filters: Filters;
  users: UserReference[];
  customers: CustomerListItem[];
  canViewAll: boolean;
  onChange: (key: keyof Filters, value: string) => void;
}

export function TaskFilters({ filters, users, customers, canViewAll, onChange }: Props) {
  return (
    <section className="filter-panel task-filter-panel" aria-label={t("Task filters")}>
      {canViewAll ? (
        <label>
          <span>{t("View")}</span>
          <select value={filters.scope} onChange={(event) => onChange("scope", event.target.value)}>
            <option value="all">{t("All tasks")}</option>
            <option value="mine">{t("My tasks")}</option>
          </select>
        </label>
      ) : null}
      <label>
        <span>{t("Search")}</span>
        <input
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder={t("Task, customer, or location")}
        />
      </label>
      <label>
        <span>{t("Status")}</span>
        <select value={filters.status} onChange={(event) => onChange("status", event.target.value)}>
          <option value="">{t("All statuses")}</option>
          {taskStatuses.map((status) => (
            <option key={status} value={status}>
              {displayLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("Priority")}</span>
        <select
          value={filters.priority}
          onChange={(event) => onChange("priority", event.target.value)}
        >
          <option value="">{t("All priorities")}</option>
          {taskPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priorityLabel(priority)}
            </option>
          ))}
        </select>
      </label>
      {canViewAll && filters.scope === "all" ? (
        <>
          <label>
            <span>{t("Assigned user")}</span>
            <select
              value={filters.assignedUserId}
              onChange={(event) => onChange("assignedUserId", event.target.value)}
            >
              <option value="">{t("All users")}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Team")}</span>
            <select
              value={filters.assignedRole}
              onChange={(event) => onChange("assignedRole", event.target.value)}
            >
              <option value="">{t("All teams")}</option>
              <option value="customer_service">{displayLabel("customer_service")}</option>
              <option value="sales_rep">{displayLabel("sales_rep")}</option>
              <option value="manager">{displayLabel("manager")}</option>
              <option value="admin">{displayLabel("admin")}</option>
            </select>
          </label>
        </>
      ) : null}
      <label>
        <span>{t("Type")}</span>
        <select
          value={filters.taskType}
          onChange={(event) => onChange("taskType", event.target.value)}
        >
          <option value="">{t("All task types")}</option>
          {operationalTaskTypes.map((type) => (
            <option key={type} value={type}>
              {displayLabel(type)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("Customer")}</span>
        <select
          value={filters.customerId}
          onChange={(event) => onChange("customerId", event.target.value)}
        >
          <option value="">{t("All customers")}</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.companyName}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("Due")}</span>
        <select value={filters.due} onChange={(event) => onChange("due", event.target.value)}>
          <option value="all">{t("All due dates")}</option>
          <option value="today">{t("Due today")}</option>
          <option value="overdue">{t("Overdue")}</option>
          <option value="upcoming">{t("Upcoming")}</option>
          <option value="none">{t("No due date")}</option>
        </select>
      </label>
      <label>
        <span>{t("Sort")}</span>
        <select value={filters.sort} onChange={(event) => onChange("sort", event.target.value)}>
          <option value="operational">{t("Operational priority")}</option>
          <option value="due_at">{t("Due date")}</option>
          <option value="priority">{t("Priority")}</option>
          <option value="created_at">{t("Created")}</option>
          <option value="customer">{t("Customer")}</option>
          <option value="status">{t("Status")}</option>
        </select>
      </label>
      <label>
        <span>{t("Direction")}</span>
        <select
          value={filters.direction}
          onChange={(event) => onChange("direction", event.target.value)}
        >
          <option value="asc">{t("Ascending")}</option>
          <option value="desc">{t("Descending")}</option>
        </select>
      </label>
    </section>
  );
}
