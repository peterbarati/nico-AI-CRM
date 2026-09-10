import { formatLabel } from "./formatting";
import type { CustomerFilterOptions, CustomerListFilters } from "./types";

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
    <section className="filter-panel" aria-label="Customer filters">
      <label>
        <span>Search</span>
        <input
          onChange={(event) => update({ search: event.target.value })}
          placeholder="Company, contact, email, city"
          type="search"
          value={filters.search}
        />
      </label>
      <label>
        <span>Status</span>
        <select
          onChange={(event) =>
            update({ active: event.target.value as CustomerListFilters["active"] })
          }
          value={filters.active}
        >
          <option value="all">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>
      <label>
        <span>Sales rep</span>
        <select
          onChange={(event) => update({ assignedSalesRepId: event.target.value })}
          value={filters.assignedSalesRepId}
        >
          <option value="">All reps</option>
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
          <option value="">All B2B states</option>
          {options?.b2bStatuses.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Segment</span>
        <select
          onChange={(event) => update({ segmentCode: event.target.value })}
          value={filters.segmentCode}
        >
          <option value="">All segments</option>
          {options?.segments.map((segment) => (
            <option key={segment.id} value={segment.code}>
              {segment.code}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Sort</span>
        <select onChange={(event) => update({ sort: event.target.value })} value={filters.sort}>
          <option value="company_name">Company name</option>
          <option value="last_order_date">Last order</option>
          <option value="turnover_90d">Turnover 90d</option>
          <option value="days_since_last_order">Days since last order</option>
        </select>
      </label>
      <label>
        <span>Direction</span>
        <select
          onChange={(event) =>
            update({ direction: event.target.value as CustomerListFilters["direction"] })
          }
          value={filters.direction}
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </label>
    </section>
  );
}
