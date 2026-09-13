import { formatCurrency, formatDate, formatDays, formatLabel } from "./formatting";
import { SegmentBadges } from "./SegmentBadges";
import type { CustomerListItem } from "./types";
import { displayLabel, t } from "../../i18n";

interface CustomerTableProps {
  customers: CustomerListItem[];
  onOpenCustomer: (customerId: string) => void;
}

export function CustomerTable({ customers, onOpenCustomer }: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <section className="empty-state">
        <h2>{t("No customers found")}</h2>
        <p>{t("Adjust the filters to broaden the result set.")}</p>
      </section>
    );
  }

  return (
    <div className="table-wrap">
      <table className="crm-table">
        <thead>
          <tr>
            <th>{t("Customer")}</th>
            <th>{t("City")}</th>
            <th>{t("Assigned sales rep")}</th>
            <th>{t("B2B status")}</th>
            <th>{t("Last order")}</th>
            <th>{t("Turnover 90d")}</th>
            <th>{t("Sales trend")}</th>
            <th>{t("Segments / risk")}</th>
            <th>{t("Open tasks")}</th>
            <th>{t("Action")}</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <strong>{customer.companyName}</strong>
                <span>{customer.contactName ?? customer.email ?? customer.externalId}</span>
              </td>
              <td>{customer.city ?? t("Unknown")}</td>
              <td>{customer.assignedSalesRep?.name ?? t("Unassigned")}</td>
              <td>
                <span className={customer.active ? "badge badge--success" : "badge badge--muted"}>
                  {customer.active ? t("Active") : t("Inactive")}
                </span>
                <span className="table-subtle">{formatLabel(customer.b2bStatus)}</span>
              </td>
              <td>
                {formatDate(customer.lastOrderDate)}
                <span className="table-subtle">{formatDays(customer.daysSinceLastOrder)}</span>
              </td>
              <td>{formatCurrency(customer.turnover90d)}</td>
              <td>
                <span className={`trend trend--${customer.salesTrend}`}>
                  {displayLabel(customer.salesTrend)}
                </span>
              </td>
              <td>
                <SegmentBadges segments={customer.segments} />
              </td>
              <td>{customer.openTaskCount}</td>
              <td>
                <button onClick={() => onOpenCustomer(customer.id)} type="button">
                  {t("Open")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
