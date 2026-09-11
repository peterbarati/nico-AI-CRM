import type { ReactNode } from "react";
import { formatCurrency, formatDate, formatLabel, isOverdueOpenTask } from "./formatting";
import { SegmentBadges } from "./SegmentBadges";
import type {
  CustomerInteraction,
  CustomerLocation,
  CustomerOverview,
  OrderSummary,
  SalesVisit,
  TaskItem
} from "./types";

interface CustomerDetailSectionsProps {
  interactions: CustomerInteraction[];
  locations: CustomerLocation[];
  orders: OrderSummary[];
  overview: CustomerOverview;
  tasks: TaskItem[];
  visits: SalesVisit[];
}

export function CustomerDetailSections({
  interactions,
  locations,
  orders,
  overview,
  tasks,
  visits
}: CustomerDetailSectionsProps) {
  return (
    <div className="detail-layout">
      <section className="detail-panel">
        <h3>CRM status</h3>
        <div className="status-stack">
          <div>
            <span>Active segments</span>
            <SegmentBadges segments={overview.segments} />
          </div>
          <div>
            <span>Open tasks</span>
            <strong>{overview.openTasks.length}</strong>
          </div>
          <div>
            <span>Last interaction</span>
            <strong>{overview.customer.lastInteraction?.result ?? "No interaction"}</strong>
            <small>{formatDate(overview.customer.lastInteraction?.createdAt)}</small>
          </div>
          <div>
            <span>Last order</span>
            <strong>{formatDate(overview.customer.lastOrderDate)}</strong>
          </div>
        </div>
      </section>
      <section className="detail-panel recommended-panel">
        <h3>Recommended action</h3>
        <p>
          Review open tasks, latest interaction result, and active segment reasons before the next
          customer contact.
        </p>
        {overview.segments[0]?.reason ? <strong>{overview.segments[0].reason}</strong> : null}
      </section>
      <DataPanel title="Orders">
        <CompactTable
          columns={["Date", "Order", "Net", "Gross", "Status", "Source"]}
          rows={orders.map((order) => [
            formatDate(order.orderDate),
            order.orderNumber,
            formatCurrency(order.netAmount, order.currency),
            formatCurrency(order.grossAmount, order.currency),
            formatLabel(order.status),
            formatLabel(order.source)
          ])}
        />
      </DataPanel>
      <DataPanel title="Interactions">
        <CompactTable
          columns={[
            "Date",
            "User",
            "Type",
            "Reason",
            "Result",
            "Notes",
            "Next action",
            "Follow-up"
          ]}
          rows={interactions.map((interaction) => [
            formatDate(interaction.createdAt),
            interaction.user.name,
            interaction.interactionType,
            interaction.reason ?? "No reason",
            interaction.result ?? "No result",
            interaction.notes ?? "No notes",
            interaction.nextAction ? formatLabel(interaction.nextAction) : "None",
            formatDate(interaction.followUpAt)
          ])}
        />
      </DataPanel>
      <DataPanel title="Tasks">
        <CompactTable
          columns={["Title", "Assigned user", "Priority", "Status", "Due date"]}
          rows={tasks.map((task) => [
            task.title,
            task.assignedUser.name,
            formatLabel(task.priority),
            formatLabel(task.status),
            isOverdueOpenTask(task.dueAt, task.status)
              ? `Overdue: ${formatDate(task.dueAt)}`
              : formatDate(task.dueAt)
          ])}
        />
      </DataPanel>
      <DataPanel title="Visits">
        <CompactTable
          columns={["Planned", "Completed", "Sales rep", "Status", "Result", "Order value"]}
          rows={visits.map((visit) => [
            formatDate(visit.plannedAt),
            formatDate(visit.completedAt),
            visit.salesRep.name,
            formatLabel(visit.status),
            visit.result ?? "No result",
            visit.orderValue === null ? "No order" : formatCurrency(visit.orderValue)
          ])}
        />
      </DataPanel>
      <DataPanel title="Locations">
        <CompactTable
          columns={["Name", "Type", "Address", "City", "Phone", "Status"]}
          rows={locations.map((location) => [
            location.name,
            formatLabel(location.locationType),
            location.address,
            location.city,
            location.phone ?? "No phone",
            location.active ? "Active" : "Inactive"
          ])}
        />
      </DataPanel>
    </div>
  );
}

function DataPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="detail-panel detail-panel--wide">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function CompactTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="muted">No records found.</p>;
  }

  return (
    <div className="table-wrap table-wrap--compact">
      <table className="crm-table crm-table--compact">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
