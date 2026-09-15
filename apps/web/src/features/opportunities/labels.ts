import type { OpportunityType, OpportunityStatus, SalesRouteStatus } from "@nico-ai-crm/shared";

export const opportunityLabels: Record<OpportunityType, string> = {
  REORDER: "Opakovaná objednávka",
  REACTIVATION: "Reaktivácia",
  RETENTION: "Udržanie zákazníka",
  CROSS_SELL: "Doplnkový predaj",
  B2B_REGISTRATION: "B2B registrácia",
  CAMPAIGN_FOLLOW_UP: "Reakcia na kampaň",
  TASK_FOLLOW_UP: "Nadväzujúca úloha",
  OVERDUE_VISIT: "Oneskorená návšteva",
  STRATEGIC: "Strategická priorita",
  OTHER: "Iná príležitosť"
};
export const opportunityStatusLabels: Record<OpportunityStatus, string> = {
  OPEN: "Otvorená",
  ACCEPTED: "Prijatá",
  DISMISSED: "Zamietnutá",
  CONVERTED: "Konvertovaná",
  EXPIRED: "Expirovaná"
};
export const routeStatusLabels: Record<SalesRouteStatus, string> = {
  DRAFT: "Koncept",
  RECOMMENDED: "Odporúčaná",
  ACCEPTED: "Prijatá",
  IN_PROGRESS: "Prebieha",
  COMPLETED: "Dokončená",
  CANCELLED: "Zrušená"
};
export const reasonLabels: Record<string, string> = {
  COMMERCIAL_POTENTIAL: "Komerčný potenciál",
  REORDER_WINDOW_OVERDUE: "Termín ďalšej objednávky uplynul",
  REACTIVATION_THRESHOLD_REACHED: "Zákazník je vhodný na reaktiváciu",
  TURNOVER_DECLINE: "Pokles obratu",
  CROSS_SELL_GAP: "Priestor pre doplnkový predaj",
  VISIT_OVERDUE: "Návšteva je po termíne",
  CAMPAIGN_FOLLOW_UP_DUE: "Reakcia na kampaň bez konverzie",
  OPEN_TASK_URGENCY: "Otvorená prioritná úloha",
  STRATEGIC_PRIORITY: "Strategický zákazník"
};
