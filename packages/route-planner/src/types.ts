export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteOpportunity extends GeoPoint {
  opportunityId: string;
  customerId: string;
  locationId: string;
  score: number;
  estimatedValue: number | null;
}

export interface RoutePlannerConfig {
  averageSpeedKmh: number;
  visitDurationMinutes: number;
  workdayMinutes: number;
  dailyVisitTarget: number;
  maxStops: number;
  distancePenaltyPerKm: number;
}

export interface PlannedRouteStop extends RouteOpportunity {
  sequence: number;
  plannedArrival: string;
  plannedDurationMinutes: number;
  distanceFromPreviousKm: number;
  travelTimeFromPreviousMinutes: number;
  routeUtility: number;
}

export interface PlannedRoute {
  stops: PlannedRouteStop[];
  plannedDistanceKm: number;
  plannedTravelMinutes: number;
  plannedVisitMinutes: number;
  plannedDurationMinutes: number;
  estimatedValue: number;
}

export interface RoutePlanInput {
  opportunities: RouteOpportunity[];
  start: GeoPoint;
  end: GeoPoint;
  startAt: string;
  config: RoutePlannerConfig;
}

export interface OpportunisticStop extends RouteOpportunity {
  detourDistanceKm: number;
  estimatedExtraMinutes: number;
  routeUtility: number;
}

export interface RouteProvider {
  readonly code: "APPROXIMATE";
  calculateRoute(input: RoutePlanInput): Promise<PlannedRoute>;
}
