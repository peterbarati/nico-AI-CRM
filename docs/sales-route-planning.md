# Sales Route Planning

Phase 1.2 uses the pure `@nico-ai-crm/route-planner` package and a provider-neutral `RouteProvider` contract. `ApproximateRouteProvider` and its development alias `MockRouteProvider` use coordinates only; no map, traffic, routing, or geocoding service is called.

## Algorithm

The planner starts with open opportunities that belong to the selected Sales Representative and have usable coordinates. It calculates Haversine distance and approximate travel time from configurable average speed. A deterministic nearest-utility heuristic chooses up to the daily visit target while respecting the workday, visit-duration, and stop limits.

Opportunity score remains commercial importance. Route utility is the opportunity score minus the configured distance penalty. The planner therefore balances value and urgency with geographic practicality instead of merely minimizing kilometres. Equal inputs produce equal ordering and metrics.

The route records approximate distance, travel minutes, visit minutes, total duration, estimated opportunity value, and ordered stops. Estimated opportunity value is not guaranteed revenue.

## Coordinates And Control

Coordinates are optional on customer locations. Missing coordinates never suppress an opportunity, but they exclude that location from an optimized route. Demo seeds contain deterministic Slovak coordinates. Development may fall back to Bratislava; production fails closed until explicit start and end coordinates are configured.

Recommended routes are advisory. The Sales Representative may accept, reorder, remove, add a nearby eligible opportunity, or recalculate. Accepted routes are not replaced by background generation. Nearby suggestions show approximate detour distance and extra minutes and require confirmation.

Route stops create records in the existing `sales_visits` table only after route acceptance. Existing task, visit, campaign, customer-scope, KPI, and reporting rules remain authoritative.

## Future Providers

A later provider can implement normalized route inputs and outputs for Google Maps, Mapbox, HERE, or TomTom without changing CRM business logic. Production integration will require provider selection, secrets in environment variables, quotas, failure handling, and legal review. A separate future geocoding provider may populate location coordinates. Live routing, live geocoding, autonomous route enforcement, machine learning, and Market Discovery are not part of Phase 1.2.
