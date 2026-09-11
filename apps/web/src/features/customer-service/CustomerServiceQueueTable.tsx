import { formatCurrency, formatDate, formatDays, formatLabel } from "../customers/formatting";
import { SegmentBadges } from "../customers/SegmentBadges";
import type { CustomerServiceQueueItem } from "./types";

interface CustomerServiceQueueTableProps {
  items: CustomerServiceQueueItem[];
  onOpenCustomer: (customerId: string) => void;
}

const priorityLabels: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  LOW: "Low",
  MEDIUM: "Medium"
};

export function CustomerServiceQueueTable({
  items,
  onOpenCustomer
}: CustomerServiceQueueTableProps) {
  if (items.length === 0) {
    return (
      <section className="empty-state">
        <h2>No calls queued</h2>
        <p>No customer currently meets the deterministic contact rules.</p>
      </section>
    );
  }

  return (
    <div className="table-wrap">
      <table className="crm-table cs-queue-table">
        <thead>
          <tr>
            <th>Priority</th>
            <th>Customer</th>
            <th>Reason</th>
            <th>Last order</th>
            <th>Reorder</th>
            <th>Trend</th>
            <th>Segments</th>
            <th>Last contact</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.customerId}>
              <td>
                <span className={`priority-pill priority-pill--${item.priority.priorityLevel}`}>
                  {priorityLabels[item.priority.priorityLevel]}
                </span>
                <span className="table-subtle">{item.priority.priorityScore} pts</span>
              </td>
              <td>
                <strong>{item.companyName}</strong>
                <span>{item.city ?? item.country}</span>
                <span>{item.assignedSalesRep?.name ?? "Unassigned sales rep"}</span>
                <span>{formatLabel(item.b2bStatus)}</span>
              </td>
              <td>
                <strong>{item.priority.reasons[0]?.message ?? "Review customer status"}</strong>
                {item.priority.reasons.slice(1, 3).map((reason) => (
                  <span key={reason.code}>{reason.message}</span>
                ))}
              </td>
              <td>
                {formatDate(item.lastOrderDate)}
                <span className="table-subtle">{formatDays(item.daysSinceLastOrder)}</span>
              </td>
              <td>
                {formatDays(item.averageReorderDays)}
                <span className="table-subtle">{item.openTaskCount} open tasks</span>
              </td>
              <td>
                <span className={`trend trend--${item.salesTrend}`}>
                  {formatLabel(item.salesTrend)}
                </span>
                <span className="table-subtle">
                  {formatCurrency(item.turnover90d)} vs {formatCurrency(item.previousTurnover90d)}
                </span>
              </td>
              <td>
                <SegmentBadges segments={item.segments} />
              </td>
              <td>
                {formatDate(item.lastInteraction?.createdAt)}
                <span className="table-subtle">
                  {item.lastInteraction?.result ?? item.lastInteraction?.reason ?? "No result"}
                </span>
              </td>
              <td>
                <strong>{item.priority.primaryRecommendedAction ?? "REVIEW"}</strong>
                <button onClick={() => onOpenCustomer(item.customerId)} type="button">
                  Open profile
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
