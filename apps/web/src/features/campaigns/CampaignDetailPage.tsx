import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import type { UserReference } from "../customers/types";
import {
  apiErrorMessage,
  campaignStatusLabel,
  displayLabel,
  formatDate,
  formatDateTime,
  formatPercentage,
  priorityLabel,
  t
} from "../../i18n";
import {
  campaignAction,
  createFollowUps,
  fetchCampaignAssignees,
  fetchCampaign,
  fetchCandidates,
  updateCampaign
} from "./api";
import type { CampaignDetail, CampaignMember } from "./types";
export function CampaignDetailPage({
  campaignId,
  onBack,
  onOpenCustomer
}: {
  campaignId: string;
  onBack: () => void;
  onOpenCustomer: (id: string) => void;
}) {
  const { actor } = useAuth();
  const canExecute = actor.permissions.includes("CAMPAIGNS_EXECUTE");
  const canWrite = actor.permissions.includes("CAMPAIGNS_WRITE");
  const canFollow =
    actor.permissions.includes("TASK_WRITE") &&
    ["admin", "manager", "customer_service"].includes(actor.role);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [candidates, setCandidates] = useState<CampaignMember[]>([]);
  const [users, setUsers] = useState<UserReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, c, o] = await Promise.all([
        fetchCampaign(campaignId),
        fetchCandidates(campaignId),
        fetchCampaignAssignees()
      ]);
      setDetail(d);
      setCandidates(c);
      setUsers(o.filter((u) => u.role === "customer_service"));
    } catch (r) {
      setError(apiErrorMessage(r, "Kampaň momentálne nie je dostupná."));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(a: "prepare" | "start" | "complete" | "cancel") {
    setBusy(true);
    setError(null);
    try {
      await campaignAction(campaignId, a);
      setNotice(t(a === "start" ? "Mock campaign started" : "Campaign updated"));
      await load();
    } catch (r) {
      setError(apiErrorMessage(r, "Akciu kampane sa nepodarilo vykonať."));
    } finally {
      setBusy(false);
    }
  }
  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await updateCampaign(campaignId, {
        name: String(values.get("name")),
        description: String(values.get("description") || "") || null,
        campaignType: String(values.get("campaignType")) as CampaignDetail["campaignType"]
      });
      setEditing(false);
      setNotice(t("Campaign updated"));
      await load();
    } catch (reason) {
      setError(apiErrorMessage(reason, "Kampaň sa nepodarilo upraviť."));
    } finally {
      setBusy(false);
    }
  }
  async function follow(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const d = new FormData(e.currentTarget);
    try {
      const result = await createFollowUps(campaignId, {
        assignedUserId: String(d.get("assignedUserId")),
        dueAt: String(d.get("dueAt") || "") || null,
        priority: String(d.get("priority") || "normal")
      });
      setNotice(
        result.created
          ? `${result.created} ${t("follow-up tasks created")}`
          : t("Follow-up tasks already exist")
      );
      await load();
    } catch (r) {
      setError(apiErrorMessage(r, "Follow-up úlohy sa nepodarilo vytvoriť."));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <div className="loading-state">{t("Loading campaign...")}</div>;
  if (error && !detail)
    return (
      <section className="error-state">
        <button className="link-button" onClick={onBack}>
          {t("Back to campaigns")}
        </button>
        <h2>{t("Campaign unavailable")}</h2>
        <p>{error}</p>
      </section>
    );
  if (!detail) return null;
  const m = detail.metrics;
  return (
    <section className="page-stack">
      <div className="detail-header">
        <button className="link-button" onClick={onBack}>
          {t("Back to campaigns")}
        </button>
        <div className="detail-header-main">
          <div>
            <p className="eyebrow">{displayLabel(detail.campaignType)}</p>
            <h2>{detail.name}</h2>
            <p>{detail.description ?? t("No description")}</p>
          </div>
          <div className="detail-actions">
            {canWrite && ["DRAFT", "READY"].includes(detail.status) ? (
              <button className="secondary-button" disabled={busy} onClick={() => setEditing(true)}>
                {t("Edit campaign")}
              </button>
            ) : null}
            {detail.status === "DRAFT" && actor.permissions.includes("CAMPAIGNS_WRITE") ? (
              <button disabled={busy} onClick={() => void action("prepare")}>
                {t("Prepare audience")}
              </button>
            ) : null}
            {detail.status === "READY" && canExecute ? (
              <button disabled={busy} onClick={() => void action("start")}>
                {t("Start campaign")}
              </button>
            ) : null}
            {detail.status === "ACTIVE" && canExecute ? (
              <button disabled={busy} onClick={() => void action("complete")}>
                {t("Complete campaign")}
              </button>
            ) : null}
            {!["COMPLETED", "CANCELLED"].includes(detail.status) && canExecute ? (
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => void action("cancel")}
              >
                {t("Cancel campaign")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {notice ? <p className="success-notice">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {editing ? (
        <form className="campaign-edit-form" onSubmit={saveEdit}>
          <label>
            <span>{t("Campaign name")}</span>
            <input name="name" defaultValue={detail.name} required maxLength={160} />
          </label>
          <label>
            <span>{t("Campaign type")}</span>
            <select name="campaignType" defaultValue={detail.campaignType}>
              {[
                "NEWSLETTER",
                "PRODUCT_LAUNCH",
                "PROMOTION",
                "REACTIVATION",
                "B2B",
                "CROSS_SELL",
                "INFORMATIONAL",
                "OTHER"
              ].map((type) => (
                <option key={type} value={type}>
                  {displayLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Description")}</span>
            <textarea name="description" defaultValue={detail.description ?? ""} rows={2} />
          </label>
          <div className="detail-actions">
            <button type="button" className="secondary-button" onClick={() => setEditing(false)}>
              {t("Cancel")}
            </button>
            <button disabled={busy}>{t("Save changes")}</button>
          </div>
        </form>
      ) : null}
      <p className="demo-notice">{t("Mock delivery only. No external communication is sent.")}</p>
      <section className="campaign-overview">
        <div>
          <span>{t("Status")}</span>
          <strong>{campaignStatusLabel(detail.status)}</strong>
        </div>
        <div>
          <span>{t("Provider")}</span>
          <strong>{displayLabel(detail.provider)}</strong>
        </div>
        <div>
          <span>{t("Audience source")}</span>
          <strong>{displayLabel(detail.audienceKind)}</strong>
        </div>
        <div>
          <span>{t("Period")}</span>
          <strong>
            {formatDate(detail.startDate)} – {formatDate(detail.endDate)}
          </strong>
        </div>
        <div>
          <span>{t("Created by")}</span>
          <strong>{detail.createdBy?.name ?? t("System")}</strong>
        </div>
        <div>
          <span>{t("Follow-up rule")}</span>
          <strong>
            {detail.followUpDelayDays} {t("days")}
          </strong>
        </div>
      </section>
      <section className="campaign-metrics">
        {[
          ["Audience", m.audience],
          ["Sent", m.sent],
          ["Delivered", m.delivered],
          ["Opened", `${m.opened} · ${formatPercentage(m.openRate)}`],
          ["Clicked", `${m.clicked} · ${formatPercentage(m.clickRate)}`],
          ["Converted", `${m.converted} · ${formatPercentage(m.conversionRate)}`],
          ["Failed", m.failed],
          ["Follow-up candidates", candidates.length]
        ].map(([k, v]) => (
          <div key={String(k)}>
            <span>{t(k as never)}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </section>
      <section className="detail-panel detail-panel--wide">
        <h3>{t("Audience")}</h3>
        {detail.members.length ? (
          <div className="table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>{t("Customer")}</th>
                  <th>{t("Delivery")}</th>
                  <th>{t("Sent")}</th>
                  <th>{t("Opened")}</th>
                  <th>{t("Clicked")}</th>
                  <th>{t("Converted")}</th>
                </tr>
              </thead>
              <tbody>
                {detail.members.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <button className="table-link" onClick={() => onOpenCustomer(x.customerId)}>
                        {x.customerName}
                      </button>
                      <small>{x.city}</small>
                    </td>
                    <td>{displayLabel(x.deliveryStatus)}</td>
                    <td>{formatDateTime(x.sentAt)}</td>
                    <td>{formatDateTime(x.openedAt)}</td>
                    <td>{formatDateTime(x.clickedAt)}</td>
                    <td>{formatDateTime(x.convertedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t("No audience members")}</p>
        )}
      </section>
      <section className="detail-panel detail-panel--wide">
        <h3>{t("Follow-up candidates")}</h3>
        {candidates.length ? (
          <>
            <div className="candidate-list">
              {candidates.map((x) => (
                <button
                  key={x.id}
                  className="table-link"
                  onClick={() => onOpenCustomer(x.customerId)}
                >
                  {x.customerName} · {x.clickedAt ? t("Clicked") : t("Opened")}
                </button>
              ))}
            </div>
            {canFollow ? (
              <form className="follow-up-form" onSubmit={follow}>
                <label>
                  <span>{t("Assigned user")}</span>
                  <select
                    name="assignedUserId"
                    required
                    defaultValue={actor.role === "customer_service" ? actor.id : users[0]?.id}
                  >
                    {users
                      .filter((u) => actor.role !== "customer_service" || u.id === actor.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <span>{t("Due date")}</span>
                  <input name="dueAt" type="datetime-local" />
                </label>
                <label>
                  <span>{t("Priority")}</span>
                  <select name="priority" defaultValue="high">
                    {["normal", "high", "urgent"].map((p) => (
                      <option key={p} value={p}>
                        {priorityLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={busy}>{t("Create follow-up tasks")}</button>
              </form>
            ) : null}
          </>
        ) : (
          <p className="muted">{t("No follow-up candidates")}</p>
        )}
      </section>
      <section className="detail-panel detail-panel--wide">
        <h3>{t("Campaign activity")}</h3>
        {detail.events.length ? (
          <ul className="task-history">
            {detail.events.map((e) => (
              <li key={e.id}>
                <strong>{displayLabel(e.eventType)}</strong>
                <span>
                  {e.provider} · {formatDateTime(e.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t("No campaign activity")}</p>
        )}
      </section>
    </section>
  );
}
