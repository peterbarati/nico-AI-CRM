import { formatLabel } from "./formatting";
import type { CustomerOverview } from "./types";
import { t } from "../../i18n";

interface CustomerDetailHeaderProps {
  overview: CustomerOverview;
  onBack: () => void;
  onLogCall: () => void;
}

export function CustomerDetailHeader({ overview, onBack, onLogCall }: CustomerDetailHeaderProps) {
  const { customer } = overview;

  return (
    <section className="detail-header">
      <button className="link-button" onClick={onBack} type="button">
        {t("Back to customers")}
      </button>
      <div className="detail-header-main">
        <div>
          <p className="eyebrow">{customer.city ?? customer.country}</p>
          <h2>{customer.companyName}</h2>
          <div className="detail-meta">
            <span className={customer.active ? "badge badge--success" : "badge badge--muted"}>
              {customer.active ? t("Active") : t("Inactive")}
            </span>
            <span className="badge">{formatLabel(customer.b2bStatus)}</span>
            <span>{customer.assignedSalesRep?.name ?? t("Unassigned sales rep")}</span>
            <span>{customer.phone ?? t("No phone")}</span>
            <span>{customer.email ?? t("No email")}</span>
          </div>
        </div>
        <div className="action-group" aria-label={t("Customer actions")}>
          <button onClick={onLogCall} type="button">
            {t("Log call")}
          </button>
          <button disabled type="button">
            {t("Create task")}
          </button>
          <button disabled type="button">
            {t("Plan visit")}
          </button>
        </div>
      </div>
    </section>
  );
}
