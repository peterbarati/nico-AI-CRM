import { useState, type FormEvent } from "react";
import {
  campaignAudienceKinds,
  campaignTypes,
  type CampaignAudienceConfig,
  type CampaignAudienceKind,
  type CampaignType
} from "@nico-ai-crm/shared";
import { apiErrorMessage, displayLabel, t } from "../../i18n";
import type { CustomerListItem, SegmentOption, UserReference } from "../customers/types";
import { createCampaign, previewAudience } from "./api";
import type { CampaignFormValues } from "./types";

export function CampaignFormModal({
  customers,
  segments,
  users,
  defaults,
  onClose,
  onCreated
}: {
  customers: CustomerListItem[];
  segments: SegmentOption[];
  users: UserReference[];
  defaults: { followUpDelayDays: number; followUpClicked: boolean; followUpOpened: boolean };
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [kind, setKind] = useState<CampaignAudienceKind>("SEGMENT");
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  function values(form: HTMLFormElement): CampaignFormValues {
    const d = new FormData(form);
    const config: CampaignAudienceConfig =
      kind === "SEGMENT"
        ? { segmentCode: String(d.get("segmentCode")) }
        : kind === "MANUAL"
          ? { customerIds: selected }
          : {
              active:
                d.get("active") === "true" ? true : d.get("active") === "false" ? false : undefined,
              b2bStatus: String(d.get("b2bStatus") || "") || undefined,
              assignedSalesRepId: String(d.get("assignedSalesRepId") || "") || undefined,
              inactivityDays: d.get("inactivityDays") ? Number(d.get("inactivityDays")) : undefined,
              city: String(d.get("city") || "") || undefined,
              country: String(d.get("country") || "") || undefined
            };
    return {
      name: String(d.get("name")),
      description: String(d.get("description") || "") || null,
      campaignType: String(d.get("campaignType")) as CampaignType,
      startDate: String(d.get("startDate") || "") || null,
      endDate: String(d.get("endDate") || "") || null,
      audienceKind: kind,
      audienceConfig: config,
      followUpClicked: d.get("followUpClicked") === "on",
      followUpOpened: d.get("followUpOpened") === "on",
      followUpDelayDays: Number(d.get("followUpDelayDays") || 2)
    };
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const c = await createCampaign(values(e.currentTarget));
      onCreated(c.id);
    } catch (r) {
      setError(apiErrorMessage(r, "Kampaň sa nepodarilo vytvoriť."));
      setSaving(false);
    }
  }
  async function runPreview(form: HTMLFormElement) {
    setError(null);
    try {
      setPreview((await previewAudience(values(form))).count);
    } catch (r) {
      setError(apiErrorMessage(r, "Publikum sa nepodarilo načítať."));
    }
  }
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="form-modal campaign-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("Add campaign")}
      >
        <div className="modal-header">
          <h2>{t("Add campaign")}</h2>
          <button type="button" aria-label={t("Close")} onClick={onClose}>
            ×
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <form className="form-grid" onSubmit={submit} onChange={() => setPreview(null)}>
          <label>
            <span>{t("Campaign name")}</span>
            <input name="name" required maxLength={160} />
          </label>
          <label>
            <span>{t("Campaign type")}</span>
            <select name="campaignType">
              {campaignTypes.map((v) => (
                <option key={v} value={v}>
                  {displayLabel(v)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("Start date")}</span>
            <input type="date" name="startDate" />
          </label>
          <label>
            <span>{t("End date")}</span>
            <input type="date" name="endDate" />
          </label>
          <label className="form-field--wide">
            <span>{t("Description")}</span>
            <textarea name="description" rows={2} />
          </label>
          <label>
            <span>{t("Audience source")}</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as CampaignAudienceKind)}>
              {campaignAudienceKinds.map((v) => (
                <option key={v} value={v}>
                  {displayLabel(v)}
                </option>
              ))}
            </select>
          </label>
          {kind === "SEGMENT" ? (
            <label>
              <span>{t("Segment")}</span>
              <select name="segmentCode" required>
                <option value="">{t("Select segment")}</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.code}>
                    {displayLabel(s.code)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {kind === "MANUAL" ? (
            <label className="form-field--wide">
              <span>{t("Customers")}</span>
              <select
                multiple
                size={6}
                value={selected}
                onChange={(e) =>
                  setSelected([...e.currentTarget.selectedOptions].map((o) => o.value))
                }
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {kind === "FILTERED" ? (
            <>
              <label>
                <span>{t("Customer status")}</span>
                <select name="active">
                  <option value="">{t("All statuses")}</option>
                  <option value="true">{t("Active")}</option>
                  <option value="false">{t("Inactive")}</option>
                </select>
              </label>
              <label>
                <span>{t("B2B status")}</span>
                <select name="b2bStatus">
                  <option value="">{t("All B2B states")}</option>
                  <option value="registered">{displayLabel("registered")}</option>
                  <option value="missing">{displayLabel("missing")}</option>
                </select>
              </label>
              <label>
                <span>{t("Assigned sales rep")}</span>
                <select name="assignedSalesRepId">
                  <option value="">{t("All reps")}</option>
                  {users
                    .filter((u) => u.role === "sales_rep")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>{t("Minimum inactivity days")}</span>
                <input type="number" min="0" name="inactivityDays" />
              </label>
              <label>
                <span>{t("City")}</span>
                <input name="city" />
              </label>
              <label>
                <span>{t("Country")}</span>
                <input name="country" defaultValue="SK" />
              </label>
            </>
          ) : null}
          <label>
            <span>{t("Follow-up delay days")}</span>
            <input
              type="number"
              min="0"
              max="365"
              name="followUpDelayDays"
              defaultValue={defaults.followUpDelayDays}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              name="followUpClicked"
              defaultChecked={defaults.followUpClicked}
            />
            <span>{t("Clicked without conversion")}</span>
          </label>
          <label className="checkbox-field">
            <input type="checkbox" name="followUpOpened" defaultChecked={defaults.followUpOpened} />
            <span>{t("Opened without conversion")}</span>
          </label>
          <div className="form-field--wide audience-preview">
            <button
              className="secondary-button"
              type="button"
              onClick={(e) => void runPreview(e.currentTarget.form!)}
            >
              {t("Preview audience")}
            </button>
            <strong>
              {preview === null
                ? t("Audience not previewed")
                : `${preview} ${preview === 1 ? t("customer") : t("customers")}`}
            </strong>
          </div>
          <div className="modal-actions form-field--wide">
            <button type="button" className="secondary-button" onClick={onClose}>
              {t("Cancel")}
            </button>
            <button disabled={saving || preview === null || preview === 0}>
              {saving ? t("Saving...") : t("Create campaign")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
