import { useEffect, useState, type FormEvent } from "react";
import { completeVisit, fetchSalesTaskDetail, scheduleVisit, startVisit } from "./api";
import { formatCurrency, formatDate, formatLabel } from "../customers/formatting";
import type { SalesTaskDetail } from "./types";

interface Props {
  taskId: string;
  onClose: () => void;
  onChanged: () => void;
  onOpenCustomer: (customerId: string) => void;
}

export function SalesTaskPanel({ taskId, onClose, onChanged, onOpenCustomer }: Props) {
  const [detail, setDetail] = useState<SalesTaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSalesTaskDetail(taskId)
      .then(setDetail)
      .catch((error: unknown) =>
        setError(error instanceof Error ? error.message : "Task unavailable.")
      );
  }, [taskId]);

  async function submit(action: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      setDetail(await fetchSalesTaskDetail(taskId));
      onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setSaving(false);
    }
  }

  function schedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submit(() =>
      scheduleVisit(taskId, {
        plannedAt: new Date(String(data.get("plannedAt"))).toISOString(),
        customerLocationId: String(data.get("customerLocationId") || "") || undefined,
        notes: String(data.get("notes") || "") || undefined,
        idempotencyKey: crypto.randomUUID()
      })
    );
  }

  function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail?.visit) return;
    const data = new FormData(event.currentTarget);
    const orderValue = String(data.get("orderValue") || "");
    const nextAction = String(data.get("nextAction"));
    const followUpAt = String(data.get("followUpAt") || "");
    if (nextAction !== "NONE" && !followUpAt) {
      setError("A follow-up date is required for the selected next action.");
      return;
    }
    void submit(() =>
      completeVisit(detail.visit!.id, {
        result: data.get("result"),
        nextAction,
        notes: String(data.get("notes") || "") || undefined,
        orderValue: orderValue ? Number(orderValue) : undefined,
        followUpAt: nextAction === "NONE" ? undefined : new Date(followUpAt).toISOString(),
        priority: data.get("priority"),
        idempotencyKey: crypto.randomUUID()
      })
    );
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="detail-drawer sales-task-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Sales task detail"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="detail-drawer__header">
          <div>
            <p className="eyebrow">Sales task</p>
            <h2>{detail?.task.title ?? "Loading..."}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {detail ? (
          <div className="page-stack">
            <section className="detail-section">
              <h3>{detail.customer.customer.companyName}</h3>
              <p>
                {detail.customer.customer.contactName ?? "No contact"} ·{" "}
                {detail.customer.customer.phone ?? "No phone"} ·{" "}
                {detail.customer.customer.email ?? "No email"}
              </p>
              <button type="button" onClick={() => onOpenCustomer(detail.task.customerId)}>
                Open customer record
              </button>
              <p>
                {detail.customer.locations[0]?.address ?? "No address"},{" "}
                {detail.customer.customer.city}
              </p>
              <p>
                90-day turnover:{" "}
                <strong>{formatCurrency(detail.customer.metrics?.turnover90d ?? 0)}</strong> · Last
                order: {formatDate(detail.customer.metrics?.lastOrderDate)}
              </p>
            </section>
            <section className="detail-section">
              <h3>Task context</h3>
              <p>{detail.task.context ?? "No additional context."}</p>
              <p>{detail.task.sourceNotes ?? detail.task.sourceReason ?? "Direct Sales task"}</p>
            </section>
            {!detail.visit ? (
              <form className="workflow-form" onSubmit={schedule}>
                <h3>Schedule visit</h3>
                <label>
                  Date and time
                  <input name="plannedAt" type="datetime-local" required />
                </label>
                <label>
                  Location
                  <select name="customerLocationId">
                    <option value="">Primary location</option>
                    {detail.customer.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} — {location.city}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Notes
                  <textarea name="notes" rows={3} />
                </label>
                <button disabled={saving} type="submit">
                  Schedule visit
                </button>
              </form>
            ) : null}
            {detail.visit ? (
              <section className="detail-section">
                <h3>Visit · {formatLabel(detail.visit.status)}</h3>
                <p>Planned {formatDate(detail.visit.plannedAt)}</p>
                {detail.visit.status === "planned" ? (
                  <button
                    disabled={saving}
                    type="button"
                    onClick={() => void submit(() => startVisit(detail.visit!.id))}
                  >
                    Start visit
                  </button>
                ) : null}
              </section>
            ) : null}
            {detail.visit && ["planned", "in_progress"].includes(detail.visit.status) ? (
              <form className="workflow-form" onSubmit={complete}>
                <h3>Complete visit</h3>
                <label>
                  Result
                  <select name="result" required>
                    {[
                      "ORDER",
                      "INTERESTED",
                      "NO_INTEREST",
                      "FOLLOW_UP",
                      "BRANDING",
                      "STOCK_CHECK",
                      "B2B_REGISTRATION",
                      "CUSTOMER_CLOSED",
                      "OTHER"
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Notes
                  <textarea name="notes" rows={3} />
                </label>
                <label>
                  Order value
                  <input min="0" name="orderValue" step="0.01" type="number" />
                </label>
                <label>
                  Next action
                  <select name="nextAction" required>
                    {[
                      "NONE",
                      "SALES_FOLLOW_UP",
                      "ANOTHER_SALES_VISIT",
                      "CUSTOMER_SERVICE_CALL",
                      "SEND_INFORMATION",
                      "B2B_REGISTRATION",
                      "REORDER_FOLLOW_UP"
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Follow-up date
                  <input name="followUpAt" type="datetime-local" />
                </label>
                <label>
                  Priority
                  <select name="priority">
                    <option>MEDIUM</option>
                    <option>HIGH</option>
                    <option>CRITICAL</option>
                    <option>LOW</option>
                  </select>
                </label>
                <button disabled={saving} type="submit">
                  Complete visit
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
