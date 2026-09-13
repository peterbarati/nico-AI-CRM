import { formatNumber, formatPercentage } from "./formatters";

const labels: Record<string, string> = {
  ACTIVE: "Aktívny",
  active: "Aktívny",
  INACTIVE: "Neaktívny",
  inactive: "Neaktívny",
  lead: "Potenciálny",
  REORDER_DUE: "Čas na doobjednanie",
  DECLINING: "Pokles obratu",
  AT_RISK: "Rizikový",
  CRITICAL: "Kritický",
  REACTIVATION: "Reaktivácia",
  B2B_MISSING: "Chýba B2B registrácia",
  CROSS_SELL: "Cross-sell príležitosť",
  NEWSLETTER_FOLLOW_UP: "Follow-up kampane",
  HIGH: "Vysoká",
  MEDIUM: "Stredná",
  LOW: "Nízka",
  urgent: "Urgentná",
  high: "Vysoká",
  normal: "Stredná",
  low: "Nízka",
  open: "Otvorená",
  OPEN: "Otvorená",
  in_progress: "Prebieha",
  IN_PROGRESS: "Prebieha",
  completed: "Dokončená",
  COMPLETED: "Dokončená",
  cancelled: "Zrušená",
  CANCELLED: "Zrušená",
  CALL: "Hovor",
  EMAIL: "E-mail",
  VISIT: "Návšteva",
  NOTE: "Poznámka",
  REORDER: "Doplnenie zásob",
  RETENTION: "Udržanie zákazníka",
  B2B_REGISTRATION: "B2B registrácia",
  CAMPAIGN_FOLLOW_UP: "Follow-up kampane",
  TASK_FOLLOW_UP: "Follow-up úlohy",
  GENERAL: "Všeobecný",
  RESOLVED: "Vyriešené",
  INTERESTED: "Má záujem",
  NOT_INTERESTED: "Nemá záujem",
  NO_ANSWER: "Bez odpovede",
  CALLBACK_REQUESTED: "Požaduje spätné volanie",
  ORDER_PROMISED: "Prisľúbená objednávka",
  NEEDS_SALES_VISIT: "Vyžaduje obchodnú návštevu",
  WRONG_CONTACT: "Nesprávny kontakt",
  OTHER: "Iné",
  NONE: "Žiadny",
  FOLLOW_UP_CALL: "Follow-up hovor",
  SALES_VISIT: "Obchodná návšteva",
  SEND_INFORMATION: "Poslať informácie",
  ORDER_CREATED_EXTERNALLY: "Objednávka vytvorená externe",
  planned: "Naplánovaná",
  PLANNED: "Naplánovaná",
  ORDER: "Objednávka",
  NO_INTEREST: "Bez záujmu",
  FOLLOW_UP: "Follow-up",
  BRANDING: "Branding",
  STOCK_CHECK: "Kontrola zásob",
  CUSTOMER_CLOSED: "Prevádzka ukončená",
  SALES_FOLLOW_UP: "Obchodný follow-up",
  ANOTHER_SALES_VISIT: "Ďalšia obchodná návšteva",
  CUSTOMER_SERVICE_CALL: "Hovor zákazníckeho servisu",
  REORDER_FOLLOW_UP: "Follow-up doobjednania",
  ON_TRACK: "Plní sa",
  BEHIND: "Za plánom",
  CS_TURNOVER: "Obrat – zákaznícky servis",
  CS_CALLS: "Hovory – zákaznícky servis",
  CS_REACTIVATIONS: "Reaktivácie – zákaznícky servis",
  CS_B2B: "B2B registrácie – zákaznícky servis",
  SALES_TURNOVER: "Obrat – obchod",
  SALES_VISITS: "Návštevy – obchod",
  SALES_REACTIVATIONS: "Reaktivácie – obchod",
  SALES_B2B: "B2B registrácie – obchod",
  admin: "Administrátor",
  manager: "Manažér",
  customer_service: "Zákaznícky servis",
  sales_rep: "Obchodný zástupca",
  registered: "Registrovaný",
  missing: "Chýba registrácia",
  pending: "Čaká na registráciu",
  MOCK: "Testovací poskytovateľ",
  mock: "Testovacie údaje",
  OIDC: "Firemné prihlásenie",
  OPENAI: "OpenAI",
  LOW_CONFIDENCE: "Nízka",
  up: "Rast",
  down: "Pokles",
  flat: "Bez zmeny",
  new: "Nový",
  retention: "Udržanie zákazníka",
  newsletter: "Newsletter",
  day: "Deň",
  week: "Týždeň",
  month: "Mesiac",
  not_applicable: "Nevzťahuje sa",
  unknown: "Neznáme",
  mock_erp: "Testovací ERP",
  retail_pos: "Predajné miesto",
  warehouse: "Sklad",
  headquarters: "Sídlo",
  delivery: "Dodacie miesto",
  other: "Iné",
  handoff: "Odovzdanie",
  visit: "Návšteva",
  "reorder reminder": "Pripomenutie doobjednania",
  "no answer": "Bez odpovede",
  "call again": "Zavolať znova",
  interested: "Má záujem",
  "email sent": "E-mail odoslaný",
  Completed: "Dokončené",
  "Email sent": "E-mail odoslaný",
  Interested: "Má záujem",
  "No answer": "Bez odpovede",
  Positive: "Pozitívny výsledok",
  "Reached buyer": "Kontaktovaná zodpovedná osoba",
  "Routine reorder check": "Pravidelná kontrola doobjednania",
  "B2B registration": "B2B registrácia",
  "Campaign click follow-up": "Follow-up po kliknutí na kampaň",
  "Reorder reminder": "Pripomenutie doobjednania",
  "Quarterly check-in": "Štvrťročná kontrola",
  "Declining turnover": "Pokles obratu",
  "Call again": "Zavolať znova",
  "Check registration": "Skontrolovať registráciu",
  "Prepare offer": "Pripraviť ponuku",
  "Sales rep visit": "Návšteva obchodného zástupcu",
  active_campaign: "Aktívna",
  READY: "Pripravený",
  DISABLED: "Vypnutý",
  UNAVAILABLE: "Nedostupný",
  "Attributed turnover": "Priradený obrat"
};

const settingLabels: Record<string, string> = {
  "customer_service.daily_target": "Denný cieľ hovorov",
  "customer_service.daily_call_target": "Denný cieľ hovorov",
  "customer_service.reorder_grace_days": "Tolerancia doobjednania (dni)",
  "customer_service.at_risk_days": "Hranica rizika (dni)",
  "customer_service.critical_days": "Kritická hranica (dni)",
  "customer_service.reactivation_days": "Hranica reaktivácie (dni)",
  "customer_service.recent_interaction_suppression_days": "Ochranná lehota po interakcii (dni)",
  "customer_service.weight_reorder_slightly_overdue": "Váha: mierne oneskorené doobjednanie",
  "customer_service.weight_reorder_significantly_overdue": "Váha: výrazne oneskorené doobjednanie",
  "customer_service.weight_reorder_severely_overdue": "Váha: kriticky oneskorené doobjednanie",
  "customer_service.weight_decline_20": "Váha: pokles obratu o 20 %",
  "customer_service.weight_decline_30": "Váha: pokles obratu o 30 %",
  "customer_service.weight_decline_50": "Váha: pokles obratu o 50 %",
  "customer_service.weight_inactivity_at_risk": "Váha: riziková neaktivita",
  "customer_service.weight_inactivity_critical": "Váha: kritická neaktivita",
  "customer_service.weight_inactivity_reactivation": "Váha: neaktivita na reaktiváciu",
  "customer_service.weight_b2b_missing": "Váha: chýbajúca B2B registrácia",
  "customer_service.weight_campaign_interest": "Váha: záujem o kampaň",
  "customer_service.weight_open_follow_up_task": "Váha: otvorená follow-up úloha",
  "customer_service.weight_overdue_follow_up_task": "Váha: follow-up úloha po termíne",
  "customer_service.weight_cross_sell": "Váha: cross-sell príležitosť",
  "customer_service.weight_recent_interaction_reduction": "Zníženie váhy po nedávnej interakcii",
  "system.business_timezone": "Firemné časové pásmo",
  "system.business_currency": "Predvolená mena",
  "business.company_name": "Názov firmy",
  "business.default_currency": "Predvolená mena",
  "business.default_reporting_period": "Predvolené obdobie reportov",
  "ai.enabled": "AI zapnutá",
  "ai.provider": "AI poskytovateľ",
  "ai.model": "AI model",
  "ai.max_output_tokens": "Maximálny počet výstupných tokenov",
  "ai.timeout_ms": "Časový limit AI (ms)",
  "ai.cache_ttl_minutes": "Platnosť AI odporúčania vo vyrovnávacej pamäti (minúty)",
  "kpi.attribution_window_days": "Atribučné obdobie KPI (dni)",
  "kpi.reactivation_inactivity_days": "Minimálna neaktivita na reaktiváciu (dni)"
};

const settingDescriptions: Record<string, string> = {
  "customer_service.daily_target": "Počet hovorov plánovaný na jeden pracovný deň.",
  "customer_service.daily_call_target": "Počet hovorov plánovaný na jeden pracovný deň.",
  "customer_service.reorder_grace_days": "Počet dní tolerancie po očakávanom termíne doobjednania.",
  "customer_service.at_risk_days": "Počet dní bez objednávky pre označenie rizikového zákazníka.",
  "customer_service.critical_days": "Počet dní bez objednávky pre kritický stav zákazníka.",
  "customer_service.reactivation_days": "Počet dní bez objednávky pre zaradenie do reaktivácie.",
  "customer_service.recent_interaction_suppression_days":
    "Obdobie, počas ktorého sa obmedzí opakovaný kontakt.",
  "customer_service.weight_reorder_slightly_overdue":
    "Body priority za mierne oneskorené doobjednanie.",
  "customer_service.weight_reorder_significantly_overdue":
    "Body priority za výrazne oneskorené doobjednanie.",
  "customer_service.weight_reorder_severely_overdue":
    "Body priority za kriticky oneskorené doobjednanie.",
  "customer_service.weight_decline_20": "Body priority za pokles obratu najmenej o 20 %.",
  "customer_service.weight_decline_30": "Body priority za pokles obratu najmenej o 30 %.",
  "customer_service.weight_decline_50": "Body priority za pokles obratu najmenej o 50 %.",
  "customer_service.weight_inactivity_at_risk": "Body priority za rizikovú neaktivitu.",
  "customer_service.weight_inactivity_critical": "Body priority za kritickú neaktivitu.",
  "customer_service.weight_inactivity_reactivation":
    "Body priority za neaktivitu spĺňajúcu podmienky reaktivácie.",
  "customer_service.weight_b2b_missing": "Body priority za chýbajúcu B2B registráciu.",
  "customer_service.weight_campaign_interest": "Body priority za záujem o kampaň.",
  "customer_service.weight_open_follow_up_task": "Body priority za otvorenú follow-up úlohu.",
  "customer_service.weight_overdue_follow_up_task": "Body priority za follow-up úlohu po termíne.",
  "customer_service.weight_cross_sell": "Body priority za cross-sell príležitosť.",
  "customer_service.weight_recent_interaction_reduction":
    "Zníženie priority po nedávno dokončenej interakcii.",
  "system.business_timezone": "Časové pásmo používané pre pracovné dátumy a reporty.",
  "system.business_currency": "Predvolená mena pre zobrazovanie obchodných hodnôt.",
  "business.company_name": "Názov firmy zobrazovaný v interných nastaveniach.",
  "business.default_currency": "Predvolená mena pre reporty a obchodné hodnoty.",
  "business.default_reporting_period": "Predvolené obdobie manažérskych reportov.",
  "ai.enabled": "Určuje, či je AI obchodný asistent dostupný.",
  "ai.provider": "Poskytovateľ AI asistenta.",
  "ai.model": "Model používaný AI poskytovateľom.",
  "ai.max_output_tokens": "Maximálna dĺžka výstupu AI asistenta.",
  "ai.timeout_ms": "Maximálny čas čakania na odpoveď AI.",
  "ai.cache_ttl_minutes": "Čas uchovania pripraveného AI odporúčania.",
  "kpi.attribution_window_days": "Obdobie na priradenie obchodného výsledku k aktivite.",
  "kpi.reactivation_inactivity_days":
    "Minimálna predchádzajúca neaktivita pre započítanie reaktivácie."
};

const apiErrors: Record<string, string> = {
  UNAUTHENTICATED: "Vyžaduje sa prihlásenie.",
  FORBIDDEN: "Na túto akciu nemáte oprávnenie.",
  NOT_FOUND: "Požadovaný záznam sa nenašiel.",
  VALIDATION_ERROR: "Skontrolujte zadané údaje.",
  BAD_REQUEST: "Skontrolujte zadané údaje.",
  API_UNAVAILABLE: "Služba momentálne nie je dostupná.",
  AUTH_SERVICE_UNAVAILABLE: "Služba prihlásenia momentálne nie je dostupná.",
  INVALID_API_RESPONSE: "Pri spracovaní požiadavky sa vyskytla neočakávaná chyba.",
  INVALID_RESPONSE: "Pri spracovaní požiadavky sa vyskytla neočakávaná chyba.",
  INTERNAL_ERROR: "Pri spracovaní požiadavky sa vyskytla neočakávaná chyba."
};

export function displayLabel(value: string | null | undefined): string {
  if (!value) return "Nepridelené";
  return labels[value] ?? value.replaceAll("_", " ").toLocaleLowerCase("sk-SK");
}

const priorityLabels: Record<string, string> = {
  CRITICAL: "Kritická",
  HIGH: "Vysoká",
  MEDIUM: "Stredná",
  LOW: "Nízka",
  urgent: "Urgentná",
  high: "Vysoká",
  normal: "Stredná",
  low: "Nízka"
};

export function priorityLabel(value: string | null | undefined): string {
  if (!value) return "Nepridelená";
  return priorityLabels[value] ?? displayLabel(value);
}

export function settingLabel(key: string): string {
  return settingLabels[key] ?? displayLabel(key.split(".").at(-1));
}

export function settingDescription(key: string): string {
  return settingDescriptions[key] ?? "Nastaviteľná hodnota firemných pravidiel.";
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  return apiErrors[code] ?? fallback;
}

export function customerServiceReason(code: string, value: number): string {
  const count = formatNumber(Math.abs(value), 0);
  const numericCount = Math.abs(value);
  switch (code) {
    case "REORDER_OVERDUE":
      return `Zákazník prekročil očakávaný interval doobjednania o ${count} ${dayNoun(numericCount)}.`;
    case "SALES_DECLINE":
      return `Obrat klesol o ${formatPercentage(Math.abs(value))} oproti predchádzajúcim 90 dňom.`;
    case "INACTIVITY":
      return `Zákazník neobjednal ${count} ${dayNoun(numericCount)}.`;
    case "B2B_MISSING":
      return "Aktívnemu zákazníkovi chýba B2B registrácia.";
    case "CAMPAIGN_INTEREST":
      return "Zákazník klikol na kampaň bez následnej objednávky.";
    case "OPEN_FOLLOW_UP_TASK":
      return openFollowUpMessage(numericCount, count);
    case "CROSS_SELL":
      return "Zákazník má cross-sell potenciál.";
    case "RECENT_INTERACTION":
      return `Posledná interakcia prebehla pred ${count} dňami; ďalší kontakt zvážte podľa potreby.`;
    default:
      return "Skontrolujte aktuálny stav zákazníka.";
  }
}

export function openTaskCountLabel(value: number): string {
  const count = formatNumber(value, 0);
  if (value === 1) return `${count} otvorená úloha`;
  if (value >= 2 && value <= 4) return `${count} otvorené úlohy`;
  return `${count} otvorených úloh`;
}

function dayNoun(value: number): string {
  if (value === 1) return "deň";
  if (value >= 2 && value <= 4) return "dni";
  return "dní";
}

function openFollowUpMessage(value: number, count: string): string {
  if (value === 1) return `${count} follow-up úloha vyžaduje pozornosť.`;
  if (value >= 2 && value <= 4) return `${count} follow-up úlohy vyžadujú pozornosť.`;
  return `${count} follow-up úloh vyžaduje pozornosť.`;
}

export function kpiLabel(code: string, fallback?: string): string {
  return labels[code] ?? fallback ?? displayLabel(code);
}

export function kpiSource(code: string): string {
  if (code.endsWith("_B2B")) return "Štruktúrované záznamy B2B aktivácií";
  if (code.endsWith("_CALLS")) return "Interakcie zákazníkov typu hovor";
  if (code.endsWith("_VISITS")) return "Dokončené obchodné návštevy";
  if (code.endsWith("_REACTIVATIONS")) return "Objednávky po stanovenom období neaktivity";
  if (code.endsWith("_TURNOVER")) return "Dokončené CRM objednávky priradené k aktivitám";
  return "Normalizované CRM údaje";
}
