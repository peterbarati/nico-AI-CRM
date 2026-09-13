import { defaultBusinessTimezone, defaultCurrency, defaultLocale } from "./config";

export interface FormatOptions {
  timeZone?: string;
  currency?: string;
}

export function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(defaultLocale, { maximumFractionDigits }).format(value);
}

export function formatCurrency(
  value: number | null | undefined,
  currency = defaultCurrency
): string {
  return new Intl.NumberFormat(defaultLocale, {
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(value ?? 0);
}

export function formatPercentage(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(defaultLocale, {
    style: "percent",
    maximumFractionDigits
  }).format(value / 100);
}

export function formatDate(
  value: string | Date | null | undefined,
  options: FormatOptions = {}
): string {
  if (!value) return "Bez dátumu";
  return new Intl.DateTimeFormat(defaultLocale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: options.timeZone ?? defaultBusinessTimezone
  }).format(new Date(value));
}

export function formatDateTime(
  value: string | Date | null | undefined,
  options: FormatOptions = {}
): string {
  if (!value) return "Bez dátumu";
  return new Intl.DateTimeFormat(defaultLocale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: options.timeZone ?? defaultBusinessTimezone
  }).format(new Date(value));
}

export function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Neznáme";
  return `${formatNumber(value, 0)} d`;
}

export function formatRelativeDays(value: number): string {
  if (value === 0) return "dnes";
  if (value === 1) return "včera";
  return `pred ${formatNumber(value, 0)} dňami`;
}
