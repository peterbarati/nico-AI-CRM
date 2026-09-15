# Campaigns Workflow

## Ownership and lifecycle

The CRM is the source of truth for campaign state, audience membership, normalized delivery events,
follow-up work, and operational conversion attribution. Delivery providers are replaceable channels.

Campaigns use `DRAFT -> READY -> ACTIVE -> COMPLETED`. A campaign in `DRAFT`, `READY`, or `ACTIVE`
may instead transition to `CANCELLED`. Completed and cancelled campaigns are terminal. Campaign types
are `NEWSLETTER`, `PRODUCT_LAUNCH`, `PROMOTION`, `REACTIVATION`, `B2B`, `CROSS_SELL`,
`INFORMATIONAL`, and `OTHER`.

## Audience and membership

An audience can come from an existing CRM segment, an explicit customer selection, or normalized CRM
filters. Preparing a campaign evaluates that definition and stores a unique `customer_campaigns`
membership for every selected customer. This snapshot is not changed when a segment or customer
attribute changes later. Repeating prepare does not duplicate memberships.

## Provider boundary

`CampaignProvider` accepts normalized campaign/member identifiers and returns normalized delivery
outcomes. `MockCampaignProvider` produces deterministic sent, delivered, opened, clicked, converted,
and failed outcomes without external communication. `EcomailCampaignProvider` and
`OmnisendCampaignProvider` are unavailable placeholders only; they contain no endpoints,
credentials, HTTP requests, or assumed provider schemas. Their capabilities remain disabled until
future integration work verifies each provider's supported channels and features.

Mock execution is rejected when `APP_ENV=production`. Selecting an unavailable placeholder provider
also fails closed. Future credentials belong in Worker environment secrets, never D1 settings.

## Events and metrics

`campaign_events` stores normalized `PREPARED`, `SENT`, `DELIVERED`, `OPENED`, `CLICKED`, `FAILED`,
`CONVERTED`, `COMPLETED`, and `CANCELLED` facts. List and detail metrics are deterministic counts and
rates with zero-safe denominators. Provider event identities can be made idempotent with the
`provider/external_event_id` constraint.

## Follow-up workflow

Campaign-level rules decide whether a member becomes eligible after a click without conversion or,
optionally, an open without click/conversion. The configured delay must elapse before eligibility.
Authorized users create existing Tasks records with type `CAMPAIGN_FOLLOW_UP`, origin `CAMPAIGN`, and
a normalized `source_campaign_id`. The database unique index prevents duplicate campaign/customer
follow-up tasks. These tasks flow through the existing Tasks and Customer Service prioritization and
reporting paths; campaign code does not duplicate those rules.

## Conversion attribution

A completed normalized CRM order after an open/click and within `campaign.attribution_window_days`
may be attributed to the membership. This boundary works the same for demo orders and future
ERP-synchronized normalized orders. Operational attribution is a workflow/reporting association,
not proof that the campaign caused the order.

## Authorization

- Admin: read, create, edit, prepare, execute, and create follow-up tasks.
- Manager: the same operational campaign permissions as Admin.
- Customer Service: read campaigns and candidates; create follow-up tasks only for themselves.
- Sales Representative: no campaign module access; assigned customer detail may show compact campaign
  history through the existing customer scope.

All checks are enforced by the Worker. Frontend controls are convenience only.

## Configuration

Non-secret settings live in `system_config`: provider choice, default follow-up delay, clicked/opened
eligibility, and attribution window. A created campaign snapshots its follow-up rules so later setting
changes do not silently alter existing work.

The approved future integrations are Ecomail and Omnisend. The CRM remains the source of truth;
providers are delivery and tracking transports. The intended data flow is:

`CRM Campaign -> CampaignProvider -> Ecomail / Omnisend -> provider events -> normalized CRM events -> follow-up logic`

No live provider integration exists yet. Future Ecomail and Omnisend implementations must preserve
the current campaign lifecycle and translate provider data behind `CampaignProvider`; React and
Customer Service logic must consume only normalized CRM contracts.

## Integration readiness

Both provider implementations require verification against their current official documentation
before development. For each provider, future work must define authentication, contact synchronization,
audience/list mapping, campaign creation and send behavior, tracking-event ingestion, webhook
verification, unsubscribe handling, bounce/failure handling, rate limits, retry/idempotency rules,
and external identifiers. No API endpoint or payload shape is assumed here.

The provider contract exposes capability metadata for `EMAIL`, `SMS`, and `PUSH` without claiming
that every provider supports every channel. Current CRM behavior remains email-oriented. Placeholder
providers report no enabled capabilities and always fail closed instead of simulating delivery.

Campaign and event identifiers stay provider-neutral in `provider`, `external_campaign_id`, and
`external_event_id`. Provider-specific columns are not permitted. A later contact mapping should use
normalized `customer_id`, `provider`, and `external_contact_id` fields in a dedicated mapping table
only when synchronization is implemented. Secrets such as `ECOMAIL_API_KEY` and
`OMNISEND_API_KEY` must be Cloudflare environment secrets, never D1 values.
