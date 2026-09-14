import type {
  CampaignAudienceConfig,
  CampaignAudienceKind,
  CampaignStatus,
  CampaignType
} from "@nico-ai-crm/shared";
import type { ApiPagination, CustomerListItem, UserReference } from "../customers/types";
export interface CampaignMetrics {
  audience: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  failed: number;
  followUpCandidates: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}
export interface CampaignSummary {
  id: string;
  name: string;
  description: string | null;
  campaignType: CampaignType;
  status: CampaignStatus;
  provider: string;
  audienceKind: CampaignAudienceKind;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserReference | null;
  metrics: CampaignMetrics;
}
export interface CampaignMember {
  id: string;
  customerId: string;
  customerName: string;
  city: string | null;
  assignedSalesRep: UserReference | null;
  deliveryStatus: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  convertedAt: string | null;
  conversionOrderId: string | null;
  failedAt: string | null;
}
export interface CampaignDetail extends CampaignSummary {
  audienceConfig: CampaignAudienceConfig;
  followUpClicked: boolean;
  followUpOpened: boolean;
  followUpDelayDays: number;
  members: CampaignMember[];
  events: Array<{
    id: string;
    memberId: string | null;
    eventType: string;
    provider: string;
    occurredAt: string;
  }>;
}
export interface CampaignFilters {
  page: number;
  pageSize: number;
  search: string;
  status: "" | CampaignStatus;
  campaignType: "" | CampaignType;
}
export interface CampaignPage {
  items: CampaignSummary[];
  pagination: ApiPagination;
}
export interface CampaignFormValues {
  name: string;
  description: string | null;
  campaignType: CampaignType;
  startDate: string | null;
  endDate: string | null;
  audienceKind: CampaignAudienceKind;
  audienceConfig: CampaignAudienceConfig;
  followUpClicked: boolean;
  followUpOpened: boolean;
  followUpDelayDays: number;
}
export interface CampaignAudiencePreview {
  customers: Array<Pick<CustomerListItem, "id" | "companyName" | "city">>;
  count: number;
}
export interface CampaignHistoryItem {
  campaignId: string;
  campaignName: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  convertedAt: string | null;
}
