import { formatCurrency, formatDate, formatDays, formatLabel } from "./formatting";
import { SegmentBadges } from "./SegmentBadges";
import type { CustomerListItem } from "./types";

interface CustomerTableProps {
  customers: CustomerListItem[];
  onOpenCustomer: (customerId: string) => void;
}

const trendLabels: Record<CustomerListItem["salesTrend"], string> = {
  down: "Down",
  flat: "Flat",
  new: "New",
  up: "Up"
};

export function CustomerTable({ customers, onOpenCustomer }: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <section className="empty-state">
        <h2>No customers found</h2>
        <p>Adjust the filters to broaden the result set.</p>
      </section>
    );
  }

  return (
    <div className="table-wrap">
      <table className="crm-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>City</th>
            <th>Assigned sales rep</th>
            <th>B2B status</th>
            <th>Last order</th>
            <th>Turnover 90d</th>
            <th>Sales trend</th>
            <th>Segments / risk</th>
            <th>Open tasks</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <strong>{customer.companyName}</strong>
                <span>{customer.contactName ?? customer.email ?? customer.externalId}</span>
              </td>
              <td>{customer.city ?? "Unknown"}</td>
              <td>{customer.assignedSalesRep?.name ?? "Unassigned"}</td>
              <td>
                <span className={customer.active ? "badge badge--success" : "badge badge--muted"}>
                  {customer.active ? "Active" : "Inactive"}
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
                  {trendLabels[customer.salesTrend]}
                </span>
              </td>
              <td>
                <SegmentBadges segments={customer.segments} />
              </td>
              <td>{customer.openTaskCount}</td>
              <td>
                <button onClick={() => onOpenCustomer(customer.id)} type="button">
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
