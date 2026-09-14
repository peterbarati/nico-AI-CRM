import type { ReactNode } from "react";
import { formatCurrency, formatDate, formatLabel, isOverdueOpenTask } from "./formatting";
import { SegmentBadges } from "./SegmentBadges";
import type {
  CustomerInteraction,
  CustomerCampaignHistory,
  CustomerLocation,
  CustomerOverview,
  OrderSummary,
  SalesVisit,
  TaskItem
} from "./types";
import { campaignStatusLabel, displayLabel, priorityLabel, t } from "../../i18n";

interface CustomerDetailSectionsProps {
  campaigns: CustomerCampaignHistory[];
  interactions: CustomerInteraction[];
  locations: CustomerLocation[];
  orders: OrderSummary[];
  overview: CustomerOverview;
  tasks: TaskItem[];
  visits: SalesVisit[];
}

export function CustomerDetailSections({
  campaigns,
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
        <h3>{t("CRM status")}</h3>
        <div className="status-stack">
          <div>
            <span>{t("Active segments")}</span>
            <SegmentBadges segments={overview.segments} />
          </div>
          <div>
            <span>{t("Open tasks")}</span>
            <strong>{overview.openTasks.length}</strong>
          </div>
          <div>
            <span>{t("Last interaction")}</span>
            <strong>
              {overview.customer.lastInteraction?.result
                ? displayLabel(overview.customer.lastInteraction.result)
                : t("No interaction")}
            </strong>
            <small>{formatDate(overview.customer.lastInteraction?.createdAt)}</small>
          </div>
          <div>
            <span>{t("Last order")}</span>
            <strong>{formatDate(overview.customer.lastOrderDate)}</strong>
          </div>
        </div>
      </section>
      <section className="detail-panel recommended-panel">
        <h3>{t("Recommended action")}</h3>
        <p>
          {t(
            "Review open tasks, latest interaction result, and active segment reasons before the next customer contact."
          )}
        </p>
        {overview.segments[0] ? <strong>{displayLabel(overview.segments[0].code)}</strong> : null}
      </section>
      <DataPanel title={t("Orders")}>
        <CompactTable
          columns={[t("Date"), t("Order"), t("Net"), t("Gross"), t("Status"), t("Source")]}
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
      <DataPanel title={t("Interactions")}>
        <CompactTable
          columns={[
            t("Date"),
            t("User"),
            t("Type"),
            t("Reason"),
            t("Result"),
            t("Notes"),
            t("Next action"),
            t("Follow-up")
          ]}
          rows={interactions.map((interaction) => [
            formatDate(interaction.createdAt),
            interaction.user.name,
            displayLabel(interaction.interactionType),
            interaction.reason ? displayLabel(interaction.reason) : t("No reason"),
            interaction.result ? displayLabel(interaction.result) : t("No result"),
            interaction.notes ?? t("No notes"),
            interaction.nextAction ? displayLabel(interaction.nextAction) : t("None"),
            formatDate(interaction.followUpAt)
          ])}
        />
      </DataPanel>
      <DataPanel title={t("Tasks")}>
        <CompactTable
          columns={[t("Title"), t("Assigned user"), t("Priority"), t("Status"), t("Due date")]}
          rows={tasks.map((task) => [
            task.title,
            task.assignedUser.name,
            priorityLabel(task.priority),
            formatLabel(task.status),
            isOverdueOpenTask(task.dueAt, task.status)
              ? `${t("Overdue")}: ${formatDate(task.dueAt)}`
              : formatDate(task.dueAt)
          ])}
        />
      </DataPanel>
      <DataPanel title={t("Campaigns")}>
        <CompactTable
          columns={[
            t("Campaign"),
            t("Type"),
            t("Status"),
            t("Sent"),
            t("Opened"),
            t("Clicked"),
            t("Converted")
          ]}
          rows={campaigns.map((campaign) => [
            campaign.campaignName,
            displayLabel(campaign.campaignType),
            campaignStatusLabel(campaign.status),
            formatDate(campaign.sentAt),
            formatDate(campaign.openedAt),
            formatDate(campaign.clickedAt),
            formatDate(campaign.convertedAt)
          ])}
        />
      </DataPanel>
      <DataPanel title={t("Visits")}>
        <CompactTable
          columns={[
            t("Planned"),
            t("Completed"),
            t("Sales rep column"),
            t("Status"),
            t("Result"),
            t("Next action"),
            t("Notes"),
            t("Order value")
          ]}
          rows={visits.map((visit) => [
            formatDate(visit.plannedAt),
            formatDate(visit.completedAt),
            visit.salesRep.name,
            formatLabel(visit.status),
            visit.result ? displayLabel(visit.result) : t("No result"),
            formatLabel(visit.nextAction),
            visit.notes ?? t("No notes"),
            visit.orderValue === null ? t("No order") : formatCurrency(visit.orderValue)
          ])}
        />
      </DataPanel>
      <DataPanel title={t("Locations")}>
        <CompactTable
          columns={[t("Name"), t("Type"), t("Address"), t("City"), t("Phone"), t("Status")]}
          rows={locations.map((location) => [
            location.name,
            formatLabel(location.locationType),
            location.address,
            location.city,
            location.phone ?? t("No phone"),
            location.active ? t("Active") : t("Inactive")
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
    return <p className="muted">{t("No records found.")}</p>;
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
