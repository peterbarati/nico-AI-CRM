import type { UserReference } from "../types";
import type { CompleteSalesVisitRequest, ScheduleSalesVisitRequest } from "@nico-ai-crm/shared";
import type { TaskItem } from "../tasks/types";

export interface SalesVisit {
  id: string;
  customerId: string;
  customerLocationId: string | null;
  salesRep: UserReference;
  plannedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  result: string | null;
  notes: string | null;
  orderValue: number | null;
  sourceTaskId: string | null;
  nextAction: string | null;
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VisitRow {
  id: string;
  customer_id: string;
  customer_location_id: string | null;
  sales_rep_id: string;
  sales_rep_name: string;
  sales_rep_email: string;
  sales_rep_role: string;
  planned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  result: string | null;
  notes: string | null;
  order_value: number | null;
  source_task_id: string | null;
  next_action: string | null;
  follow_up_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleSalesVisitCommand {
  actorUserId: string;
  createdAt: string;
  request: ScheduleSalesVisitRequest;
  sourceTaskId: string;
  visitId: string;
}

export interface CompleteSalesVisitCommand {
  actorUserId: string;
  completedAt: string;
  customerServiceUserId: string;
  followUpTaskId: string;
  request: CompleteSalesVisitRequest;
  visitId: string;
}

export interface SalesVisitWriteResult {
  duplicate: boolean;
  sourceTask: TaskItem | null;
  followUpTask: TaskItem | null;
  visit: SalesVisit;
}

export type SalesWorkflowErrorCode =
  | "TASK_NOT_FOUND"
  | "TASK_NOT_ACTIONABLE"
  | "VISIT_NOT_FOUND"
  | "VISIT_STATE_INVALID"
  | "ACTOR_NOT_FOUND"
  | "ACTOR_ROLE_INVALID"
  | "ACTOR_NOT_ASSIGNED"
  | "LOCATION_INVALID"
  | "CUSTOMER_SERVICE_USER_INVALID"
  | "IDEMPOTENCY_CONFLICT";

export class SalesWorkflowError extends Error {
  constructor(
    public readonly code: SalesWorkflowErrorCode,
    message: string
  ) {
    super(message);
    this.name = "SalesWorkflowError";
  }
}
