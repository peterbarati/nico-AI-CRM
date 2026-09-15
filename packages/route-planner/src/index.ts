export * from "./types";

import type {
  GeoPoint,
  OpportunisticStop,
  PlannedRoute,
  PlannedRouteStop,
  RouteOpportunity,
  RoutePlanInput,
  RouteProvider
} from "./types";

export const defaultRoutePlannerConfig = {
  averageSpeedKmh: 50,
  visitDurationMinutes: 45,
  workdayMinutes: 480,
  dailyVisitTarget: 7,
  maxStops: 7,
  distancePenaltyPerKm: 0.15
};

export class ApproximateRouteProvider implements RouteProvider {
  readonly code = "APPROXIMATE" as const;
  async calculateRoute(input: RoutePlanInput): Promise<PlannedRoute> {
    return planApproximateRoute(input);
  }
}

export class MockRouteProvider extends ApproximateRouteProvider {}

export function haversineDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const radiusKm = 6371;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return round(radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function planApproximateRoute(input: RoutePlanInput): PlannedRoute {
  const eligible = input.opportunities
    .filter(validCoordinates)
    .sort((a, b) => b.score - a.score || a.opportunityId.localeCompare(b.opportunityId));
  const stopLimit = Math.max(
    0,
    Math.min(input.config.dailyVisitTarget, input.config.maxStops, eligible.length)
  );
  const selected: PlannedRouteStop[] = [];
  let current = input.start;
  let elapsedMinutes = 0;
  const remaining = [...eligible];
  while (selected.length < stopLimit && remaining.length) {
    const candidates = remaining
      .map((opportunity) => {
        const distance = haversineDistanceKm(current, opportunity);
        const travelMinutes = travelTimeMinutes(distance, input.config.averageSpeedKmh);
        const returnMinutes = travelTimeMinutes(
          haversineDistanceKm(opportunity, input.end),
          input.config.averageSpeedKmh
        );
        return {
          opportunity,
          distance,
          travelMinutes,
          routeUtility: round(opportunity.score - distance * input.config.distancePenaltyPerKm),
          fits:
            elapsedMinutes + travelMinutes + input.config.visitDurationMinutes + returnMinutes <=
            input.config.workdayMinutes
        };
      })
      .filter((candidate) => candidate.fits)
      .sort(
        (a, b) =>
          b.routeUtility - a.routeUtility ||
          a.distance - b.distance ||
          a.opportunity.opportunityId.localeCompare(b.opportunity.opportunityId)
      );
    const next = candidates[0];
    if (!next) break;
    elapsedMinutes += next.travelMinutes;
    const plannedArrival = new Date(
      new Date(input.startAt).getTime() + elapsedMinutes * 60_000
    ).toISOString();
    selected.push({
      ...next.opportunity,
      sequence: selected.length + 1,
      plannedArrival,
      plannedDurationMinutes: input.config.visitDurationMinutes,
      distanceFromPreviousKm: next.distance,
      travelTimeFromPreviousMinutes: next.travelMinutes,
      routeUtility: next.routeUtility
    });
    elapsedMinutes += input.config.visitDurationMinutes;
    current = next.opportunity;
    remaining.splice(remaining.indexOf(next.opportunity), 1);
  }
  return summarize(selected, input.start, input.end, input.config.averageSpeedKmh);
}

export function reorderRoute(
  stops: RouteOpportunity[],
  order: string[],
  input: Omit<RoutePlanInput, "opportunities">
): PlannedRoute {
  const byId = new Map(stops.map((stop) => [stop.opportunityId, stop]));
  if (order.length !== stops.length || order.some((id) => !byId.has(id))) {
    throw new Error("Manual route order must include every stop exactly once.");
  }
  const ordered = order.map((id) => byId.get(id)!);
  return summarizeOrdered(ordered, input);
}

export function findOpportunisticStops(
  route: PlannedRoute,
  candidates: RouteOpportunity[],
  start: GeoPoint,
  end: GeoPoint,
  averageSpeedKmh: number,
  distancePenaltyPerKm: number,
  maxDetourKm = 20
): OpportunisticStop[] {
  const routeIds = new Set(route.stops.map((stop) => stop.opportunityId));
  const points: GeoPoint[] = [start, ...route.stops, end];
  return candidates
    .filter((candidate) => validCoordinates(candidate) && !routeIds.has(candidate.opportunityId))
    .map((candidate) => {
      let detour = Number.POSITIVE_INFINITY;
      for (let index = 0; index < points.length - 1; index += 1) {
        const direct = haversineDistanceKm(points[index]!, points[index + 1]!);
        const via =
          haversineDistanceKm(points[index]!, candidate) +
          haversineDistanceKm(candidate, points[index + 1]!);
        detour = Math.min(detour, Math.max(0, via - direct));
      }
      return {
        ...candidate,
        detourDistanceKm: round(detour),
        estimatedExtraMinutes: travelTimeMinutes(detour, averageSpeedKmh),
        routeUtility: round(candidate.score - detour * distancePenaltyPerKm)
      };
    })
    .filter((candidate) => candidate.detourDistanceKm <= maxDetourKm)
    .sort(
      (a, b) => b.routeUtility - a.routeUtility || a.opportunityId.localeCompare(b.opportunityId)
    );
}

function summarizeOrdered(
  opportunities: RouteOpportunity[],
  input: Omit<RoutePlanInput, "opportunities">
): PlannedRoute {
  const stops: PlannedRouteStop[] = [];
  let current = input.start;
  let elapsed = 0;
  for (const [index, opportunity] of opportunities.entries()) {
    const distance = haversineDistanceKm(current, opportunity);
    const travelMinutes = travelTimeMinutes(distance, input.config.averageSpeedKmh);
    elapsed += travelMinutes;
    stops.push({
      ...opportunity,
      sequence: index + 1,
      plannedArrival: new Date(new Date(input.startAt).getTime() + elapsed * 60_000).toISOString(),
      plannedDurationMinutes: input.config.visitDurationMinutes,
      distanceFromPreviousKm: distance,
      travelTimeFromPreviousMinutes: travelMinutes,
      routeUtility: round(opportunity.score - distance * input.config.distancePenaltyPerKm)
    });
    elapsed += input.config.visitDurationMinutes;
    current = opportunity;
  }
  return summarize(stops, input.start, input.end, input.config.averageSpeedKmh);
}

function summarize(
  stops: PlannedRouteStop[],
  start: GeoPoint,
  end: GeoPoint,
  speed: number
): PlannedRoute {
  const last = stops.at(-1) ?? start;
  const returnDistance = haversineDistanceKm(last, end);
  const travel =
    stops.reduce((sum, stop) => sum + stop.travelTimeFromPreviousMinutes, 0) +
    travelTimeMinutes(returnDistance, speed);
  const visits = stops.reduce((sum, stop) => sum + stop.plannedDurationMinutes, 0);
  return {
    stops,
    plannedDistanceKm: round(
      stops.reduce((sum, stop) => sum + stop.distanceFromPreviousKm, 0) + returnDistance
    ),
    plannedTravelMinutes: travel,
    plannedVisitMinutes: visits,
    plannedDurationMinutes: travel + visits,
    estimatedValue: round(stops.reduce((sum, stop) => sum + (stop.estimatedValue ?? 0), 0))
  };
}

function travelTimeMinutes(distanceKm: number, speedKmh: number): number {
  return Math.max(0, Math.ceil((distanceKm / Math.max(1, speedKmh)) * 60));
}

function validCoordinates(point: GeoPoint): boolean {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

function radians(value: number): number {
  return (value * Math.PI) / 180;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
