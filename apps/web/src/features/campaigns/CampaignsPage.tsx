import { useEffect, useState } from "react";
import { campaignStatuses, campaignTypes } from "@nico-ai-crm/shared";
import { useAuth } from "../auth/AuthContext";
import { PaginationControls } from "../customers/PaginationControls";
import type { CustomerListItem, SegmentOption, UserReference } from "../customers/types";
import {
  apiErrorMessage,
  campaignStatusLabel,
  displayLabel,
  formatDate,
  formatPercentage,
  t
} from "../../i18n";
import { fetchCampaignOptions, fetchCampaigns } from "./api";
import { CampaignFormModal } from "./CampaignFormModal";
import type { CampaignFilters, CampaignSummary } from "./types";
export function CampaignsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { actor } = useAuth();
  const canWrite = actor.permissions.includes("CAMPAIGNS_WRITE");
  const [filters, setFilters] = useState<CampaignFilters>({
    page: 1,
    pageSize: 20,
    search: "",
    status: "",
    campaignType: ""
  });
  const [items, setItems] = useState<CampaignSummary[]>([]);
  const [pagination, setPagination] = useState<
    Awaited<ReturnType<typeof fetchCampaigns>>["pagination"] | null
  >(null);
  const [options, setOptions] = useState<{
    customers: CustomerListItem[];
    segments: SegmentOption[];
    users: UserReference[];
    defaults: { followUpDelayDays: number; followUpClicked: boolean; followUpOpened: boolean };
  }>({
    customers: [],
    segments: [],
    users: [],
    defaults: { followUpDelayDays: 0, followUpClicked: false, followUpOpened: false }
  });
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (canWrite)
      fetchCampaignOptions()
        .then(setOptions)
        .catch((r) => setError(apiErrorMessage(r, "Možnosti kampaní nie sú dostupné.")));
  }, [canWrite]);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchCampaigns(filters)
      .then((r) => {
        if (mounted) {
          setItems(r.items);
          setPagination(r.pagination);
        }
      })
      .catch((r) => mounted && setError(apiErrorMessage(r, "Kampane momentálne nie sú dostupné.")))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [filters, revision]);
  const update = (key: keyof CampaignFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("Campaigns")}</p>
          <h2>{t("Campaign management")}</h2>
        </div>
        {canWrite ? <button onClick={() => setCreating(true)}>{t("Add campaign")}</button> : null}
      </div>
      <p className="demo-notice">{t("Mock delivery only. No external communication is sent.")}</p>
      <section className="filter-panel">
        <label>
          <span>{t("Search")}</span>
          <input
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            placeholder={t("Campaign name")}
          />
        </label>
        <label>
          <span>{t("Status")}</span>
          <select value={filters.status} onChange={(e) => update("status", e.target.value)}>
            <option value="">{t("All statuses")}</option>
            {campaignStatuses.map((v) => (
              <option value={v} key={v}>
                {campaignStatusLabel(v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("Campaign type")}</span>
          <select
            value={filters.campaignType}
            onChange={(e) => update("campaignType", e.target.value)}
          >
            <option value="">{t("All campaign types")}</option>
            {campaignTypes.map((v) => (
              <option value={v} key={v}>
                {displayLabel(v)}
              </option>
            ))}
          </select>
        </label>
      </section>
      {loading ? <div className="loading-state">{t("Loading campaigns...")}</div> : null}
      {error ? (
        <section className="error-state">
          <h3>{t("Campaigns unavailable")}</h3>
          <p>{error}</p>
        </section>
      ) : null}
      {!loading &&
        !error &&
        (items.length ? (
          <>
            <div className="table-wrap">
              <table className="crm-table campaign-table">
                <thead>
                  <tr>
                    {[
                      "Campaign",
                      "Type",
                      "Status",
                      "Audience",
                      "Sent",
                      "Opened",
                      "Clicked",
                      "Converted",
                      "Follow-up candidates",
                      "Period",
                      "Created",
                      "Action"
                    ].map((k) => (
                      <th key={k}>{t(k as never)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>{displayLabel(c.campaignType)}</td>
                      <td>{campaignStatusLabel(c.status)}</td>
                      <td>{c.metrics.audience}</td>
                      <td>{c.metrics.sent}</td>
                      <td>
                        {c.metrics.opened} · {formatPercentage(c.metrics.openRate)}
                      </td>
                      <td>
                        {c.metrics.clicked} · {formatPercentage(c.metrics.clickRate)}
                      </td>
                      <td>
                        {c.metrics.converted} · {formatPercentage(c.metrics.conversionRate)}
                      </td>
                      <td>{c.metrics.followUpCandidates}</td>
                      <td>
                        {formatDate(c.startDate)} – {formatDate(c.endDate)}
                      </td>
                      <td>{formatDate(c.createdAt)}</td>
                      <td>
                        <button onClick={() => onNavigate(`/campaigns/${c.id}`)}>
                          {t("Open")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              pagination={pagination}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </>
        ) : (
          <section className="empty-state">
            <h3>{t("No campaigns")}</h3>
            <p>{t("No campaigns match the selected filters.")}</p>
          </section>
        ))}
      {creating ? (
        <CampaignFormModal
          {...options}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setRevision((v) => v + 1);
            onNavigate(`/campaigns/${id}`);
          }}
        />
      ) : null}
    </section>
  );
}
