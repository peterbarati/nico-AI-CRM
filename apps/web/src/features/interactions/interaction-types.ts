import type {
  CallNextActionCode,
  CallReasonCode,
  CallResultCode,
  CreateCallRequest,
  TaskPriorityCode
} from "@nico-ai-crm/shared";
import type { CustomerInteraction, TaskItem, UserReference } from "../customers/types";

export type {
  CallNextActionCode,
  CallReasonCode,
  CallResultCode,
  CreateCallRequest,
  TaskPriorityCode
};

export interface CallWorkflowResult {
  duplicate: boolean;
  interaction: CustomerInteraction;
  task: TaskItem | null;
}

export interface CallWorkflowResponse {
  ok: true;
  data: CallWorkflowResult;
}

export type SalesRepresentative = UserReference;
