import { formatDate, formatLabel } from "../customers/formatting";
import type { SalesTask } from "./types";

interface SalesQueueTableProps {
  items: SalesTask[];
  onOpenTask: (taskId: string) => void;
}

export function SalesQueueTable({ items, onOpenTask }: SalesQueueTableProps) {
  if (items.length === 0) {
    return (
      <section className="empty-state">
        <h2>No Sales tasks</h2>
        <p>No tasks match the current filters.</p>
      </section>
    );
  }

  return (
    <div className="table-wrap">
      <table className="crm-table sales-queue-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Task</th>
            <th>Reason / context</th>
            <th>Assigned</th>
            <th>Priority</th>
            <th>Due date</th>
            <th>Visit</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.customerName}</strong>
                <span>{item.customerCity ?? "No city"}</span>
              </td>
              <td>
                <strong>{item.title}</strong>
                <span>{formatLabel(item.taskType)}</span>
              </td>
              <td>
                <strong>
                  {item.sourceReason ? formatLabel(item.sourceReason) : "Direct Sales task"}
                </strong>
                <span>{item.sourceResult ? formatLabel(item.sourceResult) : "No result"}</span>
                <span>{item.sourceNotes ?? item.context ?? "No additional context"}</span>
              </td>
              <td>
                <strong>{item.assignedUser.name}</strong>
                <span>Requested by {item.requestedBy?.name ?? "Unknown"}</span>
              </td>
              <td>
                <span className={`task-priority task-priority--${item.priority}`}>
                  {formatLabel(item.priority)}
                </span>
              </td>
              <td>{formatDate(item.dueAt)}</td>
              <td>
                <strong>{item.visit ? formatLabel(item.visit.status) : "Not scheduled"}</strong>
                <span>{item.visit?.plannedAt ? formatDate(item.visit.plannedAt) : "No visit"}</span>
              </td>
              <td>
                <button onClick={() => onOpenTask(item.id)} type="button">
                  Open task
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
