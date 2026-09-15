import type {
  OpportunityStatus,
  OpportunityType,
  SalesRouteStatus,
  SalesRouteStopStatus
} from "@nico-ai-crm/shared";
import type { ApiPagination, UserReference } from "../customers/types";

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
  generatedAt: string;
  expiresAt: string | null;
}

export interface OpportunityFilters {
  page: number;
  pageSize: number;
  salesRepId: string;
  type: string;
  status: string;
  minimumScore: string;
  hasCoordinates: string;
}

export interface RouteStop {
  id: string;
  opportunityId: string;
  customerId: string;
  customerName: string;
  locationName: string;
  address: string;
  city: string;
  opportunityType: OpportunityType;
  opportunityScore: number;
  estimatedValue: number | null;
  salesVisitId: string | null;
  sequence: number;
  plannedArrival: string;
  plannedDurationMinutes: number;
  distanceFromPreviousKm: number;
  travelTimeFromPreviousMinutes: number;
  status: SalesRouteStopStatus;
}

export interface SalesRoute {
  id: string;
  salesRep: UserReference;
  routeDate: string;
  status: SalesRouteStatus;
  provider: string;
  plannedDistanceKm: number;
  plannedTravelMinutes: number;
  plannedVisitMinutes: number;
  plannedDurationMinutes: number;
  estimatedValue: number;
  stopCount: number;
}

export interface SalesRouteDetail extends SalesRoute {
  stops: RouteStop[];
  nearbyOpportunities?: Array<{
    opportunityId: string;
    detourDistanceKm: number;
    estimatedExtraMinutes: number;
    routeUtility: number;
    opportunity: OpportunityItem;
  }>;
}

export interface Page<T> {
  items: T[];
  pagination: ApiPagination;
}
