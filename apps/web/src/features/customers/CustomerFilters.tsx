import type { CustomerFilterOptions, CustomerListFilters } from "./types";
import { displayLabel, t } from "../../i18n";

interface CustomerFiltersProps {
  filters: CustomerListFilters;
  options: CustomerFilterOptions | null;
  onChange: (filters: CustomerListFilters) => void;
}

export function CustomerFilters({ filters, options, onChange }: CustomerFiltersProps) {
  function update(patch: Partial<CustomerListFilters>) {
    onChange({
      ...filters,
      ...patch,
      page: patch.page ?? 1
    });
  }

  return (
    <section className="filter-panel" aria-label={t("Customer filters")}>
      <label>
        <span>{t("Search")}</span>
        <input
          onChange={(event) => update({ search: event.target.value })}
          placeholder={t("Company, contact, email, city")}
          type="search"
          value={filters.search}
        />
      </label>
      <label>
        <span>{t("Status")}</span>
        <select
          onChange={(event) =>
            update({ active: event.target.value as CustomerListFilters["active"] })
          }
          value={filters.active}
        >
          <option value="all">{t("All")}</option>
          <option value="true">{t("Active")}</option>
          <option value="false">{t("Inactive")}</option>
        </select>
      </label>
      <label>
        <span>{t("Sales rep")}</span>
        <select
          onChange={(event) => update({ assignedSalesRepId: event.target.value })}
          value={filters.assignedSalesRepId}
        >
          <option value="">{t("All reps")}</option>
          {options?.salesReps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>B2B</span>
        <select
          onChange={(event) => update({ b2bStatus: event.target.value })}
          value={filters.b2bStatus}
        >
          <option value="">{t("All B2B states")}</option>
          {options?.b2bStatuses.map((status) => (
            <option key={status} value={status}>
              {displayLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("Segment")}</span>
        <select
          onChange={(event) => update({ segmentCode: event.target.value })}
          value={filters.segmentCode}
        >
          <option value="">{t("All segments")}</option>
          {options?.segments.map((segment) => (
            <option key={segment.id} value={segment.code}>
              {displayLabel(segment.code)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("Sort")}</span>
        <select onChange={(event) => update({ sort: event.target.value })} value={filters.sort}>
          <option value="company_name">{t("Company name")}</option>
          <option value="last_order_date">{t("Last order")}</option>
          <option value="turnover_90d">{t("Turnover 90d")}</option>
          <option value="days_since_last_order">{t("Days since last order")}</option>
        </select>
      </label>
      <label>
        <span>{t("Direction")}</span>
        <select
          onChange={(event) =>
            update({ direction: event.target.value as CustomerListFilters["direction"] })
          }
          value={filters.direction}
        >
          <option value="asc">{t("Ascending")}</option>
          <option value="desc">{t("Descending")}</option>
        </select>
      </label>
    </section>
  );
}
