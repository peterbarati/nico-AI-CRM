import { useEffect, useState, type FormEvent } from "react";
import { completeVisit, fetchSalesTaskDetail, scheduleVisit, startVisit } from "./api";
import { formatCurrency, formatDate } from "../customers/formatting";
import type { SalesTaskDetail } from "./types";
import { apiErrorMessage, displayLabel, priorityLabel, t } from "../../i18n";

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
        setError(apiErrorMessage(error, "Úloha momentálne nie je dostupná."))
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
      setError(apiErrorMessage(error, "Akciu sa nepodarilo vykonať."));
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
      setError("Pre vybraný ďalší krok je potrebný termín follow-up.");
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
        aria-label={t("Sales task detail")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="detail-drawer__header">
          <div>
            <p className="eyebrow">{t("Sales task")}</p>
            <h2>{detail?.task.title ?? t("Loading...")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")}>
            ×
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {detail ? (
          <div className="page-stack">
            <section className="detail-section">
              <h3>{detail.customer.customer.companyName}</h3>
              <p>
                {detail.customer.customer.contactName ?? t("No contact")} ·{" "}
                {detail.customer.customer.phone ?? t("No phone")} ·{" "}
                {detail.customer.customer.email ?? t("No email")}
              </p>
              <button type="button" onClick={() => onOpenCustomer(detail.task.customerId)}>
                {t("Open customer record")}
              </button>
              <p>
                {detail.customer.locations[0]?.address ?? t("No address")},{" "}
                {detail.customer.customer.city}
              </p>
              <p>
                {t("90-day turnover")}:{" "}
                <strong>{formatCurrency(detail.customer.metrics?.turnover90d ?? 0)}</strong> ·{" "}
                {t("Last order")}: {formatDate(detail.customer.metrics?.lastOrderDate)}
              </p>
            </section>
            <section className="detail-section">
              <h3>{t("Task context")}</h3>
              <p>{detail.task.context ?? t("No additional context.")}</p>
              <p>
                {detail.task.sourceNotes ??
                  (detail.task.sourceReason
                    ? displayLabel(detail.task.sourceReason)
                    : t("Direct Sales task"))}
              </p>
            </section>
            {!detail.visit ? (
              <form className="workflow-form" onSubmit={schedule}>
                <h3>{t("Schedule visit")}</h3>
                <label>
                  {t("Date and time")}
                  <input name="plannedAt" type="datetime-local" required />
                </label>
                <label>
                  {t("Location")}
                  <select name="customerLocationId">
                    <option value="">{t("Primary location")}</option>
                    {detail.customer.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} — {location.city}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("Notes")}
                  <textarea name="notes" rows={3} />
                </label>
                <button disabled={saving} type="submit">
                  {t("Schedule visit")}
                </button>
              </form>
            ) : null}
            {detail.visit ? (
              <section className="detail-section">
                <h3>
                  {t("Visit")} · {displayLabel(detail.visit.status)}
                </h3>
                <p>
                  {t("Planned")} {formatDate(detail.visit.plannedAt)}
                </p>
                {detail.visit.status === "planned" ? (
                  <button
                    disabled={saving}
                    type="button"
                    onClick={() => void submit(() => startVisit(detail.visit!.id))}
                  >
                    {t("Start visit")}
                  </button>
                ) : null}
              </section>
            ) : null}
            {detail.visit && ["planned", "in_progress"].includes(detail.visit.status) ? (
              <form className="workflow-form" onSubmit={complete}>
                <h3>{t("Complete visit")}</h3>
                <label>
                  {t("Result")}
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
                      <option key={value} value={value}>
                        {displayLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("Notes")}
                  <textarea name="notes" rows={3} />
                </label>
                <label>
                  {t("Order value")}
                  <input min="0" name="orderValue" step="0.01" type="number" />
                </label>
                <label>
                  {t("Next action")}
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
                      <option key={value} value={value}>
                        {displayLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("Follow-up date")}
                  <input name="followUpAt" type="datetime-local" />
                </label>
                <label>
                  {t("Priority")}
                  <select name="priority">
                    {(["MEDIUM", "HIGH", "CRITICAL", "LOW"] as const).map((value) => (
                      <option key={value} value={value}>
                        {priorityLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={saving} type="submit">
                  {t("Complete visit")}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
