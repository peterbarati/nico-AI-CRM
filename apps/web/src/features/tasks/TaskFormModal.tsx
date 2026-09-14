import { useEffect, useState, type FormEvent } from "react";
import { operationalTaskTypes, taskPriorities } from "@nico-ai-crm/shared";
import { fetchCustomerOverview } from "../customers/api";
import type { CustomerListItem, CustomerLocation, UserReference } from "../customers/types";
import { apiErrorMessage, displayLabel, priorityLabel, t } from "../../i18n";
import { createTask } from "./api";

interface Props {
  users: UserReference[];
  customers: CustomerListItem[];
  defaultAssigneeId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function TaskFormModal({ users, customers, defaultAssigneeId, onClose, onCreated }: Props) {
  const [customerId, setCustomerId] = useState("");
  const [locations, setLocations] = useState<CustomerLocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setLocations([]);
      return;
    }
    let mounted = true;
    void fetchCustomerOverview(customerId)
      .then(
        (detail) => mounted && setLocations(detail.locations.filter((location) => location.active))
      )
      .catch(
        (reason: unknown) =>
          mounted && setError(apiErrorMessage(reason, "Prevádzky zákazníka nie sú dostupné."))
      );
    return () => {
      mounted = false;
    };
  }, [customerId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const dueAt = String(data.get("dueAt") || "");
      await createTask({
        assignedUserId: String(data.get("assignedUserId")),
        customerId: customerId || null,
        customerLocationId: String(data.get("customerLocationId") || "") || null,
        title: String(data.get("title")),
        description: String(data.get("description") || "") || null,
        operationalType: String(
          data.get("operationalType")
        ) as (typeof operationalTaskTypes)[number],
        priority: String(data.get("priority")) as (typeof taskPriorities)[number],
        dueAt: dueAt ? new Date(dueAt).toISOString() : null
      });
      onCreated();
      onClose();
    } catch (reason) {
      setError(apiErrorMessage(reason, "Úlohu sa nepodarilo vytvoriť."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("Add task")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t("Add task")}</h2>
          <button type="button" className="icon-button" aria-label={t("Close")} onClick={onClose}>
            ×
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <form className="user-form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              <span>{t("Customer")}</span>
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                <option value="">{t("No customer")}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Location")}</span>
              <select name="customerLocationId" disabled={!customerId}>
                <option value="">{t("No location")}</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} — {location.city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Assigned user")}</span>
              <select name="assignedUserId" defaultValue={defaultAssigneeId} required>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} — {displayLabel(user.role)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Type")}</span>
              <select name="operationalType" defaultValue="OTHER">
                {operationalTaskTypes.map((type) => (
                  <option key={type} value={type}>
                    {displayLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Priority")}</span>
              <select name="priority" defaultValue="normal">
                {taskPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel(priority)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("Due date")}</span>
              <input name="dueAt" type="datetime-local" />
            </label>
          </div>
          <label>
            <span>{t("Title")}</span>
            <input name="title" required maxLength={160} />
          </label>
          <label>
            <span>{t("Description")}</span>
            <textarea name="description" maxLength={2000} rows={4} />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              {t("Cancel")}
            </button>
            <button type="submit" disabled={saving}>
              {saving ? t("Saving...") : t("Create task")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
