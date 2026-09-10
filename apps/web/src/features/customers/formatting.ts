export function formatCurrency(value: number | null | undefined, currency = "EUR"): string {
  return new Intl.NumberFormat("en-GB", {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Unknown";
  }

  return `${value}d`;
}

export function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "Unassigned";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function isOverdueOpenTask(dueAt: string | null, status: string): boolean {
  if (!dueAt || status === "completed" || status === "cancelled") {
    return false;
  }

  return new Date(dueAt).getTime() < Date.now();
}
