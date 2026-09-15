import type {
  OpportunityStatus,
  OpportunityType,
  SalesRouteStatus,
  SalesRouteStopStatus
} from "@nico-ai-crm/shared";
import type { PaginatedResult, PaginationInput, UserReference } from "../types";

export interface OpportunityFactRecord {
  customerId: string;
  locationId: string;
  salesRepId: string;
  active: boolean;
  b2bStatus: string;
  daysSinceLastOrder: number | null;
  averageReorderDays: number | null;
  turnover90d: number;
  previousTurnover90d: number;
  lifetimeTurnover: number;
  averageOrderValue: number | null;
  daysSinceLastVisit: number | null;
  openTaskPriority: "low" | "normal" | "high" | "urgent" | null;
  sourceTaskId: string | null;
  campaignFollowUp: boolean;
  sourceCampaignId: string | null;
  crossSellGap: boolean;
  strategicPriority: boolean;
  lastOrderDate: string | null;
  lastVisitDate: string | null;
}

export interface OpportunityItem {
  id: string;
  customerId: string;
  customerName: string;
  locationId: string;
  locationName: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  salesRep: UserReference;
  opportunityType: OpportunityType;
  score: number;
  estimatedValue: number | null;
  status: OpportunityStatus;
  primaryReasonCode: string;
  reasonCodes: Array<{ code: string; contribution: number; value: unknown }>;
  facts: Record<string, unknown>;
  sourceTaskId: string | null;
  sourceCampaignId: string | null;
  generatedAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  dismissedAt: string | null;
  updatedAt: string;
}

export interface OpportunityListQuery extends PaginationInput {
  salesRepId?: string;
  opportunityType?: OpportunityType;
  status?: OpportunityStatus;
  customerId?: string;
  minimumScore?: number;
  maximumScore?: number;
  hasCoordinates?: boolean;
}

export interface SaveOpportunityCommand {
  id: string;
  customerId: string;
  locationId: string;
  salesRepId: string;
  opportunityType: OpportunityType;
  score: number;
  estimatedValue: number | null;
  primaryReasonCode: string;
  reasonCodes: unknown[];
  facts: Record<string, unknown>;
  sourceTaskId: string | null;
  sourceCampaignId: string | null;
  generatedAt: string;
  expiresAt: string;
}

export interface SaveOpportunityResult {
  opportunity: OpportunityItem;
  duplicate: boolean;
}

export interface RouteStopItem {
  id: string;
  routeId: string;
  opportunityId: string;
  customerId: string;
  customerName: string;
  locationId: string;
  locationName: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  opportunityType: OpportunityType;
  opportunityScore: number;
  estimatedValue: number | null;
  salesVisitId: string | null;
  sequence: number;
  plannedArrival: string;
  plannedDurationMinutes: number;
  distanceFromPreviousKm: number;
  travelTimeFromPreviousMinutes: number;
  routeUtility: number;
  status: SalesRouteStopStatus;
}

export interface SalesRouteItem {
  id: string;
  salesRep: UserReference;
  routeDate: string;
  status: SalesRouteStatus;
  provider: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  plannedDistanceKm: number;
  plannedTravelMinutes: number;
  plannedVisitMinutes: number;
  plannedDurationMinutes: number;
  estimatedValue: number;
  stopCount: number;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesRouteDetail extends SalesRouteItem {
  stops: RouteStopItem[];
}

export interface RouteListQuery extends PaginationInput {
  salesRepId?: string;
  status?: SalesRouteStatus;
  routeDate?: string;
}

export interface SaveRouteCommand {
  id: string;
  salesRepId: string;
  routeDate: string;
  provider: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  plannedDistanceKm: number;
  plannedTravelMinutes: number;
  plannedVisitMinutes: number;
  plannedDurationMinutes: number;
  estimatedValue: number;
  createdByUserId: string;
  now: string;
  stops: Array<{
    id: string;
    opportunityId: string;
    customerId: string;
    locationId: string;
    sequence: number;
    plannedArrival: string;
    plannedDurationMinutes: number;
    distanceFromPreviousKm: number;
    travelTimeFromPreviousMinutes: number;
    routeUtility: number;
  }>;
}

export interface RouteSaveResult {
  route: SalesRouteDetail;
  replaced: boolean;
}

export class OpportunityWriteError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "OpportunityWriteError";
  }
}

export type OpportunityPage = PaginatedResult<OpportunityItem>;
export type RoutePage = PaginatedResult<SalesRouteItem>;
