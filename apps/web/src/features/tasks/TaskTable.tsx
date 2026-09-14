import { displayLabel, formatDateTime, priorityLabel, t } from "../../i18n";
import type { OperationalTask } from "./types";

interface Props {
  items: OperationalTask[];
  canWrite: boolean;
  onOpen: (taskId: string) => void;
  onTransition: (task: OperationalTask, action: "start" | "complete" | "cancel") => void;
  onOpenCustomer: (customerId: string) => void;
}

export function TaskTable({ items, canWrite, onOpen, onTransition, onOpenCustomer }: Props) {
  if (!items.length) {
    return (
      <section className="empty-state">
        <h3>{t("No tasks found")}</h3>
        <p>{t("No tasks match the selected filters.")}</p>
      </section>
    );
  }
  return (
    <div className="table-wrap">
      <table className="crm-table tasks-table">
        <thead>
          <tr>
            <th>{t("Task")}</th>
            <th>{t("Customer")}</th>
            <th>{t("Type")}</th>
            <th>{t("Priority")}</th>
            <th>{t("Status")}</th>
            <th>{t("Assigned user")}</th>
            <th>{t("Created by")}</th>
            <th>{t("Due date")}</th>
            <th>{t("Source")}</th>
            <th>{t("Created")}</th>
            <th>{t("Action")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((task) => (
            <tr key={task.id}>
              <td>
                <strong>{task.title}</strong>
                <span>{task.description ?? t("No description")}</span>
              </td>
              <td>
                {task.customerId ? (
                  <button
                    className="link-button"
                    type="button"
                    onClick={() => onOpenCustomer(task.customerId!)}
                  >
                    {task.customerName}
                  </button>
                ) : (
                  t("No customer")
                )}
                <span>{task.locationName ?? task.customerCity ?? t("No location")}</span>
              </td>
              <td>{displayLabel(task.operationalType)}</td>
              <td>
                <span className={`task-priority task-priority--${task.priority}`}>
                  {priorityLabel(task.priority)}
                </span>
              </td>
              <td>{displayLabel(task.status)}</td>
              <td>{task.assignedUser.name}</td>
              <td>{task.createdByUser?.name ?? t("System")}</td>
              <td>
                {formatDateTime(task.dueAt)}
                {task.overdue ? <span className="overdue-label">{t("Overdue")}</span> : null}
              </td>
              <td>{displayLabel(task.sourceOrigin)}</td>
              <td>{formatDateTime(task.createdAt)}</td>
              <td>
                <div className="task-actions">
                  <button type="button" onClick={() => onOpen(task.id)}>
                    {t("Open")}
                  </button>
                  {canWrite && task.status === "open" ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onTransition(task, "start")}
                    >
                      {t("Start")}
                    </button>
                  ) : null}
                  {canWrite && ["open", "in_progress"].includes(task.status) ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onTransition(task, "complete")}
                    >
                      {t("Complete task")}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
