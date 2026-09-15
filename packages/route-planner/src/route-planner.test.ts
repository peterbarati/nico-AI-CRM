import { describe, expect, it } from "vitest";
import {
  ApproximateRouteProvider,
  defaultRoutePlannerConfig,
  findOpportunisticStops,
  haversineDistanceKm,
  planApproximateRoute,
  reorderRoute,
  type RouteOpportunity
} from "./index";

const start = { latitude: 48.1486, longitude: 17.1077 };
const opportunities: RouteOpportunity[] = [
  {
    opportunityId: "opp-a",
    customerId: "cus-a",
    locationId: "loc-a",
    latitude: 48.16,
    longitude: 17.12,
    score: 80,
    estimatedValue: 300
  },
  {
    opportunityId: "opp-b",
    customerId: "cus-b",
    locationId: "loc-b",
    latitude: 48.2,
    longitude: 17.2,
    score: 95,
    estimatedValue: 500
  },
  {
    opportunityId: "opp-c",
    customerId: "cus-c",
    locationId: "loc-c",
    latitude: 48.17,
    longitude: 17.14,
    score: 55,
    estimatedValue: null
  }
];

const input = {
  opportunities,
  start,
  end: start,
  startAt: "2026-09-15T06:00:00.000Z",
  config: defaultRoutePlannerConfig
};

describe("approximate route planner", () => {
  it("calculates Haversine distance", () => {
    expect(haversineDistanceKm(start, opportunities[0]!)).toBeGreaterThan(1);
    expect(haversineDistanceKm(start, start)).toBe(0);
  });

  it("produces a deterministic ordered route with bounded stops and daily target", async () => {
    const first = planApproximateRoute({
      ...input,
      config: { ...input.config, dailyVisitTarget: 2, maxStops: 2 }
    });
    const second = await new ApproximateRouteProvider().calculateRoute({
      ...input,
      config: { ...input.config, dailyVisitTarget: 2, maxStops: 2 }
    });
    expect(first).toEqual(second);
    expect(first.stops).toHaveLength(2);
    expect(first.stops.map((stop) => stop.sequence)).toEqual([1, 2]);
    expect(first.plannedDistanceKm).toBeGreaterThan(0);
  });

  it("respects the workday and ignores missing coordinates", () => {
    const route = planApproximateRoute({
      ...input,
      opportunities: [
        ...opportunities,
        { ...opportunities[0]!, opportunityId: "missing", latitude: Number.NaN }
      ],
      config: { ...input.config, workdayMinutes: 50 }
    });
    expect(route.stops.length).toBeLessThanOrEqual(1);
    expect(route.stops.some((stop) => stop.opportunityId === "missing")).toBe(false);
  });

  it("uses commercial score and travel cost as separate route utility inputs", () => {
    const route = planApproximateRoute(input);
    expect(route.stops[0]!.routeUtility).toBeLessThanOrEqual(route.stops[0]!.score);
    expect(route.estimatedValue).toBe(800);
  });

  it("preserves a valid manual order and recalculates route metrics", () => {
    const route = reorderRoute(opportunities.slice(0, 2), ["opp-a", "opp-b"], input);
    expect(route.stops.map((stop) => stop.opportunityId)).toEqual(["opp-a", "opp-b"]);
    expect(() => reorderRoute(opportunities.slice(0, 2), ["opp-a"], input)).toThrow(
      "every stop exactly once"
    );
  });

  it("finds nearby opportunistic stops and exposes approximate detour", () => {
    const route = planApproximateRoute({ ...input, opportunities: opportunities.slice(0, 1) });
    const nearby = findOpportunisticStops(
      route,
      opportunities,
      start,
      start,
      input.config.averageSpeedKmh,
      input.config.distancePenaltyPerKm,
      20
    );
    expect(nearby[0]).toMatchObject({ opportunityId: expect.any(String) });
    expect(nearby[0]!.detourDistanceKm).toBeGreaterThanOrEqual(0);
    expect(nearby[0]!.estimatedExtraMinutes).toBeGreaterThanOrEqual(0);
  });
});
