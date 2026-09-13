import { formatCurrency, formatDate, formatDays, formatLabel } from "../customers/formatting";
import { SegmentBadges } from "../customers/SegmentBadges";
import type { CustomerServiceQueueItem } from "./types";
import {
  customerServiceReason,
  displayLabel,
  formatNumber,
  openTaskCountLabel,
  priorityLabel,
  t
} from "../../i18n";

interface CustomerServiceQueueTableProps {
  items: CustomerServiceQueueItem[];
  onLogCall: (item: CustomerServiceQueueItem) => void;
  onOpenCustomer: (customerId: string) => void;
  onPrepareCall: (item: CustomerServiceQueueItem) => void;
}

export function CustomerServiceQueueTable({
  items,
  onLogCall,
  onOpenCustomer,
  onPrepareCall
}: CustomerServiceQueueTableProps) {
  if (items.length === 0) {
    return (
      <section className="empty-state">
        <h2>{t("No calls queued")}</h2>
        <p>{t("No customer currently meets the deterministic contact rules.")}</p>
      </section>
    );
  }

  return (
    <div className="table-wrap">
      <table className="crm-table cs-queue-table">
        <thead>
          <tr>
            <th>{t("Priority")}</th>
            <th>{t("Customer")}</th>
            <th>{t("Reason")}</th>
            <th>{t("Last order")}</th>
            <th>{t("Reorder")}</th>
            <th>{t("Trend")}</th>
            <th>{t("Segments")}</th>
            <th>{t("Last contact")}</th>
            <th>{t("Action")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.customerId}>
              <td>
                <span className={`priority-pill priority-pill--${item.priority.priorityLevel}`}>
                  {priorityLabel(item.priority.priorityLevel)}
                </span>
                <span className="table-subtle">
                  {formatNumber(item.priority.priorityScore, 0)} b.
                </span>
              </td>
              <td>
                <strong>{item.companyName}</strong>
                <span>{item.city ?? item.country}</span>
                <span>{item.assignedSalesRep?.name ?? t("Unassigned sales rep")}</span>
                <span>{formatLabel(item.b2bStatus)}</span>
              </td>
              <td>
                <strong>
                  {item.priority.reasons[0]
                    ? customerServiceReason(
                        item.priority.reasons[0].code,
                        item.priority.reasons[0].value
                      )
                    : t("Review customer status")}
                </strong>
                {item.priority.reasons.slice(1, 3).map((reason) => (
                  <span key={reason.code}>{customerServiceReason(reason.code, reason.value)}</span>
                ))}
              </td>
              <td>
                {formatDate(item.lastOrderDate)}
                <span className="table-subtle">{formatDays(item.daysSinceLastOrder)}</span>
              </td>
              <td>
                {formatDays(item.averageReorderDays)}
                <span className="table-subtle">{openTaskCountLabel(item.openTaskCount)}</span>
              </td>
              <td>
                <span className={`trend trend--${item.salesTrend}`}>
                  {displayLabel(item.salesTrend)}
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
                  {item.lastInteraction?.result || item.lastInteraction?.reason
                    ? displayLabel(item.lastInteraction?.result ?? item.lastInteraction?.reason)
                    : t("No result")}
                </span>
              </td>
              <td>
                <strong>
                  {item.priority.primaryRecommendedAction
                    ? displayLabel(item.priority.primaryRecommendedAction)
                    : t("Review customer status")}
                </strong>
                <button
                  className="secondary-button"
                  onClick={() => onPrepareCall(item)}
                  type="button"
                >
                  {t("Prepare call")}
                </button>
                <button onClick={() => onLogCall(item)} type="button">
                  {t("Log call")}
                </button>
                <button onClick={() => onOpenCustomer(item.customerId)} type="button">
                  {t("Open profile")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
