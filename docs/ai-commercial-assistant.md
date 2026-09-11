# AI commercial assistant

## Architecture

The assistant follows one direction only:

`normalized CRM data -> deterministic rules and metrics -> structured context -> AIProvider -> validated advisory output -> human decision`

`packages/ai-assistant` owns the provider contract, context/output types, prompt version, JSON Schema, response validation, deterministic mock provider, and OpenAI provider. The Worker fetches bounded CRM facts, calculates priority before invoking AI, and persists only safe audit/cache metadata linked to the authenticated CRM actor. React never calls an AI provider directly and never assembles authoritative context.

## Providers

- `MockAIProvider` is deterministic, requires no secret, and is the default for development and tests.
- `OpenAIProvider` calls the Responses API with JSON Schema Structured Outputs, a request timeout, bounded output tokens, and `store: false`. Its output is validated again locally before use.

Set `ai.provider` to `OPENAI` and configure the `OPENAI_API_KEY` Worker secret to enable the real provider. The key is never stored in D1 or returned to the frontend.

## Context and grounding

Context version `customer-commercial-context-v1` contains customer identity needed for the task, normalized commercial metrics, deterministic priority and reasons, segments, bounded interaction/order/task history, latest visit, campaign state, purchased products/categories, and structured cross-sell signals. Raw database rows, credentials, and unnecessary internal IDs are excluded.

Prompt `customer-commercial-assistant-v1` instructs the model not to invent orders, customer statements, turnover, campaign behavior, product interest, KPIs, scores, or segments; not to claim causal certainty; and to state when evidence is insufficient.

## Structured output

The validated response contains customer summary, priority explanation, call reason and objective, recommended action, suggested opening, objections, optional cross-sell and risk summaries, and `LOW`, `MEDIUM`, or `HIGH` confidence. Invalid or partial output is rejected as a whole.

## Fallback and caching

Generation is user-triggered. Disabled or unconfigured providers return deterministic facts and a neutral availability state. Timeout, rate-limit/provider, and malformed-output failures return controlled errors; they never block queue, customer detail, call logging, or Sales workflows.

Successful output is cached for the configured TTL using customer, purpose, context, provider, model, and prompt version fingerprint. `ai_assistant_runs` stores provider/model/version, success or failure, latency, optional token counts, fingerprint, and cached response JSON. It does not store API keys or full prompts.

The `SALES_VISIT_PREPARATION` purpose is defined for a later Sales UI, but this phase does not expose that workflow.

## Official API basis

The OpenAI boundary follows the official Responses API and Structured Outputs documentation: [Create a model response](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).
