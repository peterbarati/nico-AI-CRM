import type {
  CustomerListInteractionSummary,
  CustomerListSegment,
  UserReference
} from "../customers/types";

export type CustomerServicePriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface CustomerServicePriorityReason {
  code: string;
  severity: CustomerServicePriorityLevel;
  value: number;
  scoreImpact: number;
  message: string;
}

export interface CustomerServicePriority {
  customerId: string;
  priorityScore: number;
  priorityLevel: CustomerServicePriorityLevel;
  reasons: CustomerServicePriorityReason[];
  recommendedActions: string[];
  primaryRecommendedAction: string | null;
  shouldContact: boolean;
}

export interface CustomerServiceQueueItem {
  customerId: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  active: boolean;
  b2bStatus: string;
  assignedSalesRep: UserReference | null;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  averageReorderDays: number | null;
  turnover90d: number;
  previousTurnover90d: number;
  salesTrend: "up" | "flat" | "down" | "new";
  openTaskCount: number;
  overdueTaskCount: number;
  campaignClickedWithoutConversion: boolean;
  lastInteraction: CustomerListInteractionSummary | null;
  segments: CustomerListSegment[];
  priority: CustomerServicePriority;
}

export interface CustomerServiceSummary {
  dailyCallTarget: number;
  callsCompletedToday: number;
  callsRemaining: number;
  criticalCustomers: number;
  highPriorityCustomers: number;
  reactivationCandidates: number;
  overdueFollowUps: number;
}

export interface CustomerServiceQueueResponse {
  ok: true;
  data: {
    items: CustomerServiceQueueItem[];
    summary: CustomerServiceSummary;
    meta: {
      generatedAt: string;
      limit: number;
      evaluatedCandidates: number;
      returned: number;
    };
  };
}
