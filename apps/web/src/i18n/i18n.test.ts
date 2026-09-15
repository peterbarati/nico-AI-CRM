import { describe, expect, it } from "vitest";
import {
  apiErrorMessage,
  customerServiceReason,
  defaultLocale,
  displayLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage,
  kpiLabel,
  openTaskCountLabel,
  priorityLabel,
  settingLabel,
  t
} from "./index";

describe("Slovak localization", () => {
  it("uses Slovak as the default and resolves navigation and display mappings", () => {
    expect(defaultLocale).toBe("sk-SK");
    expect(t("Dashboard")).toBe("Prehľad");
    expect(t("Customer Service")).toBe("Zákaznícky servis");
    expect(displayLabel("sales_rep")).toBe("Obchodný zástupca");
    expect(displayLabel("REORDER_DUE")).toBe("Čas na doobjednanie");
    expect(displayLabel("IN_PROGRESS")).toBe("Prebieha");
    expect(kpiLabel("CS_CALLS")).toBe("Hovory – zákaznícky servis");
    expect(settingLabel("customer_service.daily_target")).toBe("Denný cieľ hovorov");
    expect(settingLabel("customer_service.daily_call_target")).toBe("Denný cieľ hovorov");
    expect(settingLabel("customer_service.weight_decline_30")).toBe("Váha: pokles obratu o 30 %");
    expect(settingLabel("business.default_reporting_period")).toBe("Predvolené obdobie reportov");
    expect(settingLabel("ai.cache_ttl_minutes")).toContain("Platnosť AI odporúčania");
    expect(kpiLabel("Attributed turnover", "Attributed turnover")).toBe("Priradený obrat");
    expect(priorityLabel("CRITICAL")).toBe("Kritická");
    expect(displayLabel("CRITICAL")).toBe("Kritický");
    expect(displayLabel("MOCK")).toBe("Testovací provider");
    expect(displayLabel("ECOMAIL")).toBe("Ecomail");
    expect(displayLabel("OMNISEND")).toBe("Omnisend");
  });

  it("formats dates, times, numbers, currency, and percentages for Slovakia", () => {
    expect(formatDate("2026-09-11T12:30:00.000Z")).toBe("11. 9. 2026");
    expect(formatDateTime("2026-09-11T12:30:00.000Z")).toContain("14:30");
    expect(normalizeSpace(formatNumber(12450.5))).toBe("12 450,5");
    expect(normalizeSpace(formatCurrency(1250))).toBe("1 250,00 €");
    expect(normalizeSpace(formatPercentage(32.4))).toBe("32,4 %");
  });

  it("localizes stable reason and API error codes without changing them", () => {
    expect(customerServiceReason("REORDER_OVERDUE", 12)).toContain("12 dní");
    expect(customerServiceReason("REORDER_OVERDUE", 4)).toContain("4 dni");
    expect(customerServiceReason("OPEN_FOLLOW_UP_TASK", 1)).toContain("1 follow-up úloha");
    expect(openTaskCountLabel(1)).toBe("1 otvorená úloha");
    expect(apiErrorMessage({ code: "FORBIDDEN" }, "fallback")).toBe(
      "Na túto akciu nemáte oprávnenie."
    );
    expect(apiErrorMessage({ code: "UNEXPECTED" }, "Bezpečná chyba.")).toBe("Bezpečná chyba.");
  });
});

function normalizeSpace(value: string): string {
  return value.replace(/\s/g, " ");
}
