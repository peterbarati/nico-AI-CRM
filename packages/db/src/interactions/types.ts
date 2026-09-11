import type { UserReference } from "../types";
import type { CreateCallRequest } from "@nico-ai-crm/shared";
import type { TaskItem } from "../tasks/types";

export interface CustomerInteraction {
  id: string;
  customerId: string;
  customerLocationId: string | null;
  user: UserReference;
  interactionType: string;
  reason: string | null;
  result: string | null;
  notes: string | null;
  nextAction: string | null;
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InteractionRow {
  id: string;
  customer_id: string;
  customer_location_id: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  interaction_type: string;
  reason: string | null;
  result: string | null;
  notes: string | null;
  next_action: string | null;
  follow_up_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCallWorkflowCommand {
  actorUserId: string;
  createdAt: string;
  customerId: string;
  interactionId: string;
  request: CreateCallRequest;
  taskId: string;
}

export interface CallWorkflowWriteResult {
  duplicate: boolean;
  interaction: CustomerInteraction;
  task: TaskItem | null;
}

export type CallWorkflowErrorCode =
  | "CUSTOMER_NOT_FOUND"
  | "ACTOR_NOT_FOUND"
  | "ACTOR_ROLE_INVALID"
  | "SALES_REP_NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT";

export class CallWorkflowError extends Error {
  constructor(
    public readonly code: CallWorkflowErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CallWorkflowError";
  }
}
