import {
  callNextActionCodes,
  callReasonCodes,
  callResultCodes,
  taskPriorityCodes,
  type CallNextActionCode,
  type CallReasonCode,
  type CallResultCode,
  type TaskPriorityCode
} from "@nico-ai-crm/shared";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatLabel } from "../customers/formatting";
import { createCustomerCall, fetchSalesRepresentatives } from "./interaction-api";
import type { CallWorkflowResult, SalesRepresentative } from "./interaction-types";
import { apiErrorMessage, priorityLabel, t } from "../../i18n";

interface LogCallFormProps {
  customerId: string;
  customerName: string;
  defaultSalesRepId?: string;
  onCancel: () => void;
  onSuccess: (result: CallWorkflowResult) => void;
  suggestedReason?: CallReasonCode;
}

interface FormState {
  reason: CallReasonCode;
  result: CallResultCode;
  notes: string;
  nextAction: CallNextActionCode;
  followUpAt: string;
  salesRepUserId: string;
  priority: TaskPriorityCode;
}

export function LogCallForm({
  customerId,
  customerName,
  defaultSalesRepId = "",
  onCancel,
  onSuccess,
  suggestedReason = "GENERAL"
}: LogCallFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    createInitialState(suggestedReason, defaultSalesRepId)
  );
  const [salesReps, setSalesReps] = useState<SalesRepresentative[]>([]);
  const [loadingSalesReps, setLoadingSalesReps] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const createsTask = form.nextAction !== "NONE";
  const isSalesHandoff = form.nextAction === "SALES_VISIT";

  useEffect(() => {
    let mounted = true;
    fetchSalesRepresentatives()
      .then((users) => {
        if (mounted) {
          setSalesReps(users);
        }
      })
      .catch((unknownError: unknown) => {
        if (mounted) {
          setError(apiErrorMessage(unknownError, "Obchodní zástupcovia nie sú dostupní."));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingSalesReps(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const minimumFollowUp = useMemo(() => toLocalDateTime(new Date(Date.now() + 60_000)), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await createCustomerCall(customerId, {
        reason: form.reason,
        result: form.result,
        notes: form.notes,
        nextAction: form.nextAction,
        priority: form.priority,
        idempotencyKey,
        ...(form.followUpAt ? { followUpAt: new Date(form.followUpAt).toISOString() } : {}),
        ...(form.salesRepUserId ? { salesRepUserId: form.salesRepUserId } : {})
      });
      onSuccess(result);
    } catch (unknownError) {
      setError(apiErrorMessage(unknownError, "Hovor sa nepodarilo uložiť."));
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="log-call-title"
        aria-modal="true"
        className="modal-panel"
        role="dialog"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{t("Customer interaction")}</p>
            <h2 id="log-call-title">{t("Log call")}</h2>
          </div>
          <button
            aria-label={t("Close")}
            className="icon-button"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            X
          </button>
        </div>
        <form className="call-form" onSubmit={handleSubmit}>
          <label>
            <span>{t("Customer")}</span>
            <input readOnly value={customerName} />
          </label>
          <div className="form-grid">
            <label>
              <span>{t("Call reason")}</span>
              <select
                value={form.reason}
                onChange={(event) => update("reason", event.target.value as CallReasonCode)}
              >
                {callReasonCodes.map((code) => (
                  <option key={code} value={code}>
                    {formatLabel(code)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Call result")}</span>
              <select
                value={form.result}
                onChange={(event) => {
                  const result = event.target.value as CallResultCode;
                  update("result", result);
                  if (result === "NEEDS_SALES_VISIT") {
                    update("nextAction", "SALES_VISIT");
                  }
                }}
              >
                {callResultCodes.map((code) => (
                  <option key={code} value={code}>
                    {formatLabel(code)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span>{t("Notes")}</span>
            <textarea
              maxLength={4000}
              onChange={(event) => update("notes", event.target.value)}
              rows={4}
              value={form.notes}
            />
          </label>
          <div className="form-grid">
            <label>
              <span>{t("Next action")}</span>
              <select
                value={form.nextAction}
                onChange={(event) => update("nextAction", event.target.value as CallNextActionCode)}
              >
                {callNextActionCodes.map((code) => (
                  <option key={code} value={code}>
                    {formatLabel(code)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Task priority")}</span>
              <select
                disabled={!createsTask}
                value={form.priority}
                onChange={(event) => update("priority", event.target.value as TaskPriorityCode)}
              >
                {taskPriorityCodes.map((code) => (
                  <option key={code} value={code}>
                    {priorityLabel(code)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {createsTask ? (
            <div className="form-grid">
              <label>
                <span>{t("Follow-up date/time")}</span>
                <input
                  min={minimumFollowUp}
                  onChange={(event) => update("followUpAt", event.target.value)}
                  required
                  type="datetime-local"
                  value={form.followUpAt}
                />
              </label>
              {isSalesHandoff ? (
                <label>
                  <span>{t("Sales Representative")}</span>
                  <select
                    disabled={loadingSalesReps}
                    onChange={(event) => update("salesRepUserId", event.target.value)}
                    required
                    value={form.salesRepUserId}
                  >
                    <option value="">{t("Select Sales Representative")}</option>
                    {salesReps.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div />
              )}
            </div>
          ) : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="modal-actions">
            <button className="secondary-button" disabled={saving} onClick={onCancel} type="button">
              {t("Cancel")}
            </button>
            <button disabled={saving || loadingSalesReps} type="submit">
              {saving ? t("Saving...") : t("Save call")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function createInitialState(reason: CallReasonCode, defaultSalesRepId: string): FormState {
  return {
    reason,
    result: "RESOLVED",
    notes: "",
    nextAction: "NONE",
    followUpAt: "",
    salesRepUserId: defaultSalesRepId,
    priority: "MEDIUM"
  };
}

function toLocalDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
