import { formatDate, formatLabel } from "../customers/formatting";
import type { SalesHandoffTask } from "./types";

interface SalesQueueTableProps {
  items: SalesHandoffTask[];
  onOpenCustomer: (customerId: string) => void;
}

export function SalesQueueTable({ items, onOpenCustomer }: SalesQueueTableProps) {
  if (items.length === 0) {
    return (
      <section className="empty-state">
        <h2>No sales handoffs</h2>
        <p>There are no open Customer Service handoffs assigned to Sales.</p>
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
            <th>Source</th>
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
                  {item.sourceReason ? formatLabel(item.sourceReason) : "Customer Service handoff"}
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
                <strong>Customer Service call</strong>
                <span>{item.sourceInteractionId}</span>
              </td>
              <td>
                <button onClick={() => onOpenCustomer(item.customerId)} type="button">
                  Open customer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
