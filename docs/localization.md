# Localization

## Default locale

The Phase 1 user interface uses `sk-SK` by default. The document language is `sk`, business dates use the configured business timezone, and the default formatting currency is `EUR` when a record does not provide one.

## Architecture

Localization is intentionally lightweight and lives in `apps/web/src/i18n`:

- `sk.ts` is the Slovak translation catalog.
- `en.ts` documents the English fallback locale. Translation keys are English source strings, so an untranslated key remains readable in English.
- `mappings.ts` owns labels for stable enum/API/database codes, settings keys, KPI codes, queue reason codes, and API error codes.
- `formatters.ts` owns Slovak date, time, number, currency, percentage, day, and relative-time formatting.
- `index.ts` is the public localization boundary.

Components should use `t()` for interface copy, `displayLabel()` for normalized codes, and the centralized formatting helpers. Do not create component-local enum label maps or direct `Intl` instances.

## Internal codes

Database values, API payloads, structured AI property names, business-rule codes, and authorization roles remain unchanged. Localization applies only at the presentation boundary. New internal codes must receive a display mapping before they are exposed in the UI.

## AI output

The commercial-assistant prompt requires concise professional Slovak output, preserved company/product/brand names, a clear distinction between facts and recommendations, and unchanged structured property names. `MockAIProvider` follows the same rule. Prompt versions must change when output-language behavior changes so cached content cannot retain an obsolete language.

## Adding strings

1. Add static interface copy to `sk.ts` and call it through `t()`.
2. Add enum, status, role, KPI, settings, provider, or error-code labels to `mappings.ts`.
3. Use formatter helpers for all user-facing dates and numeric values.
4. Add a focused test for new mapping or formatting behavior; avoid assertions coupled to whole paragraphs.

English remains the source-key fallback and reference language. A language switcher is not part of Phase 1.

## Visual boundary

Localization must not alter the corporate colors, typography, spacing, shadows, radii, navigation structure, tables, or component system. That visual system is owned by the IT team. Only narrowly scoped overflow corrections are permitted when translated text becomes unusable.
