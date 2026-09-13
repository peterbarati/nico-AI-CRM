export {
  displayLabel as formatLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDays,
  formatNumber,
  formatPercentage
} from "../../i18n";

export function isOverdueOpenTask(dueAt: string | null, status: string): boolean {
  if (!dueAt || status === "completed" || status === "cancelled") return false;
  return new Date(dueAt).getTime() < Date.now();
}
