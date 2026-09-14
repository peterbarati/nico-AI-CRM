import { useEffect, useState, type FormEvent } from "react";
import { operationalTaskTypes, taskPriorities } from "@nico-ai-crm/shared";
import type { UserReference } from "../customers/types";
import {
  apiErrorMessage,
  displayLabel,
  formatCurrency,
  formatDateTime,
  priorityLabel,
  t
} from "../../i18n";
import { fetchTaskDetail, transitionTask, updateTask } from "./api";
import type { TaskDetail } from "./types";

interface Props {
  taskId: string;
  users: UserReference[];
  canWrite: boolean;
  onClose: () => void;
  onChanged: () => void;
  onOpenCustomer: (customerId: string) => void;
}

export function TaskDetailDrawer({
  taskId,
  users,
  canWrite,
  onClose,
  onChanged,
  onOpenCustomer
}: Props) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => setDetail(await fetchTaskDetail(taskId));
  useEffect(() => {
    void refresh().catch((reason: unknown) =>
      setError(apiErrorMessage(reason, "Detail úlohy momentálne nie je dostupný."))
    );
  }, [taskId]);

  async function run(action: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await refresh();
      onChanged();
    } catch (reason) {
      setError(apiErrorMessage(reason, "Akciu s úlohou sa nepodarilo vykonať."));
    } finally {
      setSaving(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const data = new FormData(event.currentTarget);
    const dueAt = String(data.get("dueAt") || "");
    void run(() =>
      updateTask(taskId, {
        assignedUserId: String(data.get("assignedUserId")),
        title: String(data.get("title")),
        description: String(data.get("description") || "") || null,
        operationalType: String(
          data.get("operationalType")
        ) as (typeof operationalTaskTypes)[number],
        priority: String(data.get("priority")) as (typeof taskPriorities)[number],
        dueAt: dueAt ? new Date(dueAt).toISOString() : null
      })
    );
  }

  const task = detail?.task;
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="detail-drawer task-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t("Task detail")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="detail-drawer__header">
          <div>
            <p className="eyebrow">{t("Task detail")}</p>
            <h2>{task?.title ?? t("Loading...")}</h2>
          </div>
          <button type="button" className="icon-button" aria-label={t("Close")} onClick={onClose}>
            ×
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {task ? (
          <div className="page-stack">
            <section className="detail-section task-detail-summary">
              <p>
                <strong>{t("Status")}:</strong> {displayLabel(task.status)} ·{" "}
                <strong>{t("Priority")}:</strong> {priorityLabel(task.priority)}
              </p>
              <p>
                <strong>{t("Assigned user")}:</strong> {task.assignedUser.name} ·{" "}
                <strong>{t("Created by")}:</strong> {task.createdByUser?.name ?? t("System")}
              </p>
              <p>
                <strong>{t("Due date")}:</strong> {formatDateTime(task.dueAt)}{" "}
                {task.overdue ? `· ${t("Overdue")}` : ""}
              </p>
              <p>
                <strong>{t("Created")}:</strong> {formatDateTime(task.createdAt)} ·{" "}
                <strong>{t("Completed date")}:</strong> {formatDateTime(task.completedAt)}
              </p>
              {task.customerId ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => onOpenCustomer(task.customerId!)}
                >
                  {task.customerName} · {task.locationName ?? task.customerCity}
                </button>
              ) : (
                <p>{t("No customer")}</p>
              )}
            </section>
            <section className="detail-section">
              <h3>{t("Source context")}</h3>
              <p>{displayLabel(task.sourceOrigin)}</p>
              {task.sourceContext.interaction ? (
                <div className="source-context">
                  <strong>{t("Customer interaction")}</strong>
                  <span>
                    {displayLabel(task.sourceContext.interaction.reason)} ·{" "}
                    {displayLabel(task.sourceContext.interaction.result)}
                  </span>
                  <p>{task.sourceContext.interaction.notes ?? t("No notes")}</p>
                </div>
              ) : null}
              {task.sourceContext.visit ? (
                <div className="source-context">
                  <strong>{t("Sales visit")}</strong>
                  <span>
                    {displayLabel(task.sourceContext.visit.result)} ·{" "}
                    {formatCurrency(task.sourceContext.visit.orderValue)}
                  </span>
                  <p>{task.sourceContext.visit.notes ?? t("No notes")}</p>
                </div>
              ) : null}
              {!task.sourceContext.interaction && !task.sourceContext.visit ? (
                <p>{task.description ?? t("No additional context.")}</p>
              ) : null}
            </section>
            {canWrite && ["open", "in_progress"].includes(task.status) ? (
              <form className="workflow-form" onSubmit={save}>
                <h3>{t("Edit task")}</h3>
                <label>
                  <span>{t("Title")}</span>
                  <input name="title" maxLength={160} defaultValue={task.title} required />
                </label>
                <label>
                  <span>{t("Assigned user")}</span>
                  <select name="assignedUserId" defaultValue={task.assignedUser.id}>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("Type")}</span>
                  <select name="operationalType" defaultValue={task.operationalType}>
                    {operationalTaskTypes.map((type) => (
                      <option key={type} value={type}>
                        {displayLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("Priority")}</span>
                  <select name="priority" defaultValue={task.priority}>
                    {taskPriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabel(priority)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("Due date")}</span>
                  <input
                    name="dueAt"
                    type="datetime-local"
                    defaultValue={toLocalInput(task.dueAt)}
                  />
                </label>
                <label>
                  <span>{t("Description")}</span>
                  <textarea
                    name="description"
                    defaultValue={task.description ?? ""}
                    maxLength={2000}
                  />
                </label>
                <button type="submit" disabled={saving}>
                  {t("Save changes")}
                </button>
              </form>
            ) : null}
            {canWrite && ["open", "in_progress"].includes(task.status) ? (
              <section className="detail-section">
                <h3>{t("Task actions")}</h3>
                <div className="action-group">
                  {task.status === "open" ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void run(() => transitionTask(taskId, "start"))}
                    >
                      {t("Start")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void run(() => transitionTask(taskId, "complete"))}
                  >
                    {t("Complete task")}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={saving}
                    onClick={() => void run(() => transitionTask(taskId, "cancel"))}
                  >
                    {t("Cancel task")}
                  </button>
                </div>
              </section>
            ) : null}
            <section className="detail-section">
              <h3>{t("Task history")}</h3>
              {detail.events.length ? (
                <ul className="task-history">
                  {detail.events.map((event) => (
                    <li key={event.id}>
                      <strong>{displayLabel(event.eventType)}</strong>
                      <span>
                        {event.actor.name} · {formatDateTime(event.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t("No task changes recorded.")}</p>
              )}
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
