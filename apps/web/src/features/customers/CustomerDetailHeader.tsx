import { formatLabel } from "./formatting";
import type { CustomerOverview } from "./types";

interface CustomerDetailHeaderProps {
  overview: CustomerOverview;
  onBack: () => void;
}

export function CustomerDetailHeader({ overview, onBack }: CustomerDetailHeaderProps) {
  const { customer } = overview;

  return (
    <section className="detail-header">
      <button className="link-button" onClick={onBack} type="button">
        Back to customers
      </button>
      <div className="detail-header-main">
        <div>
          <p className="eyebrow">{customer.city ?? customer.country}</p>
          <h2>{customer.companyName}</h2>
          <div className="detail-meta">
            <span className={customer.active ? "badge badge--success" : "badge badge--muted"}>
              {customer.active ? "Active" : "Inactive"}
            </span>
            <span className="badge">{formatLabel(customer.b2bStatus)}</span>
            <span>{customer.assignedSalesRep?.name ?? "Unassigned sales rep"}</span>
            <span>{customer.phone ?? "No phone"}</span>
            <span>{customer.email ?? "No email"}</span>
          </div>
        </div>
        <div className="action-group" aria-label="Read-only future actions">
          <button disabled type="button">
            Log call
          </button>
          <button disabled type="button">
            Create task
          </button>
          <button disabled type="button">
            Plan visit
          </button>
        </div>
      </div>
    </section>
  );
}
