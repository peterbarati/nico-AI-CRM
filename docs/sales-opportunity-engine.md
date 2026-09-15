# Sales Opportunity Engine

Phase 1.2 ranks normalized CRM customers with deterministic rules. CRM facts enter the pure `@nico-ai-crm/opportunity-engine` package; React, D1, route providers, Money S4, and AI are outside that package.

## Score

The opportunity score is commercial importance from 0 to 100. Configurable factors are commercial potential, deterministic reorder propensity, reactivation, turnover decline, product-category cross-sell gap, overdue visit, open task or campaign urgency, and optional strategic priority. Geography is deliberately excluded from the commercial score and affects only route utility.

Each result stores stable reason codes and a facts snapshot. The UI translates codes into Slovak. Generated prose is never the source of truth. The engine selects one primary type while retaining all contributing reasons.

Reactivation uses the central 90-day business threshold by default. Reorder compares the customer metric's expected interval with days since the last order. Retention uses historical turnover decline. Cross-sell is based on purchased product categories rather than a permanent brand-specific rule. Registered B2B customers do not receive B2B-registration opportunities.

## Lifecycle And Deduplication

Opportunities move through `OPEN`, `ACCEPTED`, `DISMISSED`, `CONVERTED`, and `EXPIRED`. A partial unique index prevents duplicate active opportunities for the same customer, location, Sales Representative, and type. Re-generation refreshes an open record; it never overwrites an accepted recommendation. Expired or resolved signals can be generated again when facts still justify them.

An opportunity may reference a source task or campaign. It does not duplicate the task. Campaign clicks without conversion become deterministic follow-up facts. Route stops reference opportunities, and created visits use the existing `sales_visits` workflow, preserving the data needed for later effectiveness analysis.

## AI Boundary

AI may later explain an existing score, suggest a visit objective, or prepare talking points using the stored facts. It must not change scores, invent facts, or silently override a user's decision. The complete workflow works with AI disabled.

External prospect discovery and Money S4 remain outside this module. They belong to later phases and must supply normalized data through their own boundaries.
