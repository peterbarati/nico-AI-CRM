import { formatDate, formatLabel } from "../customers/formatting";
import type { SalesTask } from "./types";
import { displayLabel, priorityLabel, t } from "../../i18n";

interface SalesQueueTableProps {
  items: SalesTask[];
  onOpenTask: (taskId: string) => void;
}

export function SalesQueueTable({ items, onOpenTask }: SalesQueueTableProps) {
  if (items.length === 0) {
    return (
      <section className="empty-state">
        <h2>{t("No Sales tasks")}</h2>
        <p>{t("No tasks match the current filters.")}</p>
      </section>
    );
  }

  return (
    <div className="table-wrap">
      <table className="crm-table sales-queue-table">
        <thead>
          <tr>
            <th>{t("Customer")}</th>
            <th>{t("Task")}</th>
            <th>{t("Reason / context")}</th>
            <th>{t("Assigned")}</th>
            <th>{t("Priority")}</th>
            <th>{t("Due date")}</th>
            <th>{t("Visit")}</th>
            <th>{t("Action")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.customerName}</strong>
                <span>{item.customerCity ?? t("No city")}</span>
              </td>
              <td>
                <strong>{item.title}</strong>
                <span>{formatLabel(item.taskType)}</span>
              </td>
              <td>
                <strong>
                  {item.sourceReason ? displayLabel(item.sourceReason) : t("Direct Sales task")}
                </strong>
                <span>{item.sourceResult ? displayLabel(item.sourceResult) : t("No result")}</span>
                <span>{item.sourceNotes ?? item.context ?? t("No additional context")}</span>
              </td>
              <td>
                <strong>{item.assignedUser.name}</strong>
                <span>
                  {t("Requested by {name}", { name: item.requestedBy?.name ?? t("Unknown") })}
                </span>
              </td>
              <td>
                <span className={`task-priority task-priority--${item.priority}`}>
                  {priorityLabel(item.priority)}
                </span>
              </td>
              <td>{formatDate(item.dueAt)}</td>
              <td>
                <strong>{item.visit ? displayLabel(item.visit.status) : t("Not scheduled")}</strong>
                <span>
                  {item.visit?.plannedAt ? formatDate(item.visit.plannedAt) : t("No visit")}
                </span>
              </td>
              <td>
                <button onClick={() => onOpenTask(item.id)} type="button">
                  {t("Open task")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
