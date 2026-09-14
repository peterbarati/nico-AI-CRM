import { ApiClientError, requestApiData, requestApiEnvelope } from "../../lib/api-client";
import type { CustomerListItem, SegmentOption, UserReference } from "../customers/types";
import type { SettingsData } from "../settings/types";
import type {
  CampaignAudiencePreview,
  CampaignDetail,
  CampaignFilters,
  CampaignFormValues,
  CampaignHistoryItem,
  CampaignMember,
  CampaignPage,
  CampaignSummary
} from "./types";
export async function fetchCampaigns(filters: CampaignFilters): Promise<CampaignPage> {
  const q = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) });
  if (filters.search.trim()) q.set("search", filters.search.trim());
  if (filters.status) q.set("status", filters.status);
  if (filters.campaignType) q.set("campaignType", filters.campaignType);
  const response = await requestApiEnvelope<CampaignSummary[]>(`/api/campaigns?${q}`);
  if (!isPagination(response.pagination))
    throw new ApiClientError("INVALID_API_RESPONSE", "Invalid pagination.", 500);
  return { items: response.data, pagination: response.pagination };
}
export function fetchCampaign(id: string) {
  return requestApiData<CampaignDetail>(`/api/campaigns/${encodeURIComponent(id)}`);
}
export function createCampaign(values: CampaignFormValues) {
  return requestApiData<CampaignSummary>("/api/campaigns", json("POST", values));
}
export function updateCampaign(
  id: string,
  values: Pick<CampaignFormValues, "name" | "description" | "campaignType">
) {
  return requestApiData<CampaignDetail>(
    `/api/campaigns/${encodeURIComponent(id)}`,
    json("PATCH", values)
  );
}
export function previewAudience(
  values: Pick<CampaignFormValues, "audienceKind" | "audienceConfig">
) {
  return requestApiData<CampaignAudiencePreview>(
    "/api/campaigns/audience-preview",
    json("POST", values)
  );
}
export function campaignAction(id: string, action: "prepare" | "start" | "complete" | "cancel") {
  return requestApiData<{ campaign: CampaignDetail; duplicate: boolean }>(
    `/api/campaigns/${encodeURIComponent(id)}/${action}`,
    { method: "POST" }
  );
}
export function fetchCandidates(id: string) {
  return requestApiData<CampaignMember[]>(
    `/api/campaigns/${encodeURIComponent(id)}/follow-up-candidates`
  );
}
export function createFollowUps(
  id: string,
  values: { assignedUserId: string; dueAt: string | null; priority: string }
) {
  return requestApiData<{ eligible: number; created: number; duplicate: boolean }>(
    `/api/campaigns/${encodeURIComponent(id)}/follow-up-tasks`,
    json("POST", values)
  );
}
export function fetchCampaignHistory(customerId: string) {
  return requestApiData<CampaignHistoryItem[]>(
    `/api/customers/${encodeURIComponent(customerId)}/campaigns`
  );
}
export function fetchCampaignAssignees() {
  return requestApiData<UserReference[]>("/api/users?role=customer_service");
}
export async function fetchCampaignOptions() {
  const [customers, segments, users, settings] = await Promise.all([
    requestApiEnvelope<CustomerListItem[]>(
      "/api/customers?page=1&pageSize=100&sort=company_name&direction=asc"
    ),
    requestApiData<SegmentOption[]>("/api/segments"),
    requestApiData<UserReference[]>("/api/users"),
    requestApiData<SettingsData>("/api/settings")
  ]);
  const setting = (key: string, fallback: string) =>
    settings.sections.campaign.find((item) => item.key === key)?.value ?? fallback;
  return {
    customers: customers.data,
    segments,
    users,
    defaults: {
      followUpDelayDays: Number(setting("campaign.follow_up.delay_days", "2")),
      followUpClicked: setting("campaign.follow_up.clicked_no_conversion", "true") === "true",
      followUpOpened: setting("campaign.follow_up.opened_no_conversion", "false") === "true"
    }
  };
}
function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
function isPagination(v: unknown): v is CampaignPage["pagination"] {
  return (
    typeof v === "object" &&
    v !== null &&
    ["page", "pageSize", "total", "totalPages"].every(
      (k) => typeof v[k as keyof typeof v] === "number"
    )
  );
}
