export const callReasonCodes = [
  "REORDER",
  "RETENTION",
  "REACTIVATION",
  "B2B_REGISTRATION",
  "CROSS_SELL",
  "CAMPAIGN_FOLLOW_UP",
  "TASK_FOLLOW_UP",
  "GENERAL"
] as const;

export const callResultCodes = [
  "ORDER_PROMISED",
  "ORDER_CREATED_EXTERNALLY",
  "INTERESTED",
  "NOT_INTERESTED",
  "CALLBACK_REQUESTED",
  "NO_ANSWER",
  "WRONG_CONTACT",
  "NEEDS_SALES_VISIT",
  "RESOLVED",
  "OTHER"
] as const;

export const callNextActionCodes = [
  "NONE",
  "FOLLOW_UP_CALL",
  "SALES_VISIT",
  "SEND_INFORMATION",
  "B2B_REGISTRATION",
  "OTHER"
] as const;

export const taskPriorityCodes = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type CallReasonCode = (typeof callReasonCodes)[number];
export type CallResultCode = (typeof callResultCodes)[number];
export type CallNextActionCode = (typeof callNextActionCodes)[number];
export type TaskPriorityCode = (typeof taskPriorityCodes)[number];

export interface CreateCallRequest {
  reason: CallReasonCode;
  result: CallResultCode;
  notes?: string;
  nextAction: CallNextActionCode;
  followUpAt?: string;
  salesRepUserId?: string;
  priority?: TaskPriorityCode;
  idempotencyKey: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export type CreateCallValidationResult =
  { success: true; data: CreateCallRequest } | { success: false; issues: ValidationIssue[] };

export function validateCreateCallRequest(
  value: unknown,
  now = new Date()
): CreateCallValidationResult {
  if (!isRecord(value)) {
    return { success: false, issues: [{ field: "body", message: "A JSON object is required." }] };
  }

  const issues: ValidationIssue[] = [];
  const reason = readEnum(value.reason, callReasonCodes, "reason", issues);
  const result = readEnum(value.result, callResultCodes, "result", issues);
  const nextAction = readEnum(value.nextAction, callNextActionCodes, "nextAction", issues);
  const priority = value.priority
    ? readEnum(value.priority, taskPriorityCodes, "priority", issues)
    : "MEDIUM";
  const notes = readOptionalText(value.notes, "notes", 4000, issues);
  const salesRepUserId = readOptionalText(value.salesRepUserId, "salesRepUserId", 100, issues);
  const idempotencyKey = readOptionalText(value.idempotencyKey, "idempotencyKey", 100, issues);
  const followUpAt = readOptionalDate(value.followUpAt, "followUpAt", issues);

  if (!idempotencyKey || idempotencyKey.length < 8) {
    issues.push({
      field: "idempotencyKey",
      message: "Idempotency key must contain at least 8 characters."
    });
  }

  if (nextAction && nextAction !== "NONE") {
    if (!followUpAt) {
      issues.push({ field: "followUpAt", message: "Follow-up date is required for this action." });
    } else if (new Date(followUpAt).getTime() <= now.getTime()) {
      issues.push({ field: "followUpAt", message: "Follow-up date must be in the future." });
    }
  }

  const requiresSalesVisit = result === "NEEDS_SALES_VISIT" || nextAction === "SALES_VISIT";
  if (requiresSalesVisit && nextAction !== "SALES_VISIT") {
    issues.push({
      field: "nextAction",
      message: "A sales visit result requires SALES_VISIT as the next action."
    });
  }
  if (requiresSalesVisit && !salesRepUserId) {
    issues.push({
      field: "salesRepUserId",
      message: "A Sales Representative is required for a sales visit handoff."
    });
  }

  if (issues.length > 0 || !reason || !result || !nextAction || !priority || !idempotencyKey) {
    return { success: false, issues };
  }

  return {
    success: true,
    data: {
      reason,
      result,
      nextAction,
      priority,
      idempotencyKey,
      ...(notes ? { notes } : {}),
      ...(followUpAt ? { followUpAt } : {}),
      ...(salesRepUserId ? { salesRepUserId } : {})
    }
  };
}

function readEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
  issues: ValidationIssue[]
): T[number] | undefined {
  if (typeof value === "string" && allowed.includes(value)) {
    return value as T[number];
  }

  issues.push({ field, message: `Must be one of: ${allowed.join(", ")}.` });
  return undefined;
}

function readOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
  issues: ValidationIssue[]
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    issues.push({ field, message: "Must be text." });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    issues.push({ field, message: `Must not exceed ${maxLength} characters.` });
    return undefined;
  }
  return trimmed || undefined;
}

function readOptionalDate(
  value: unknown,
  field: string,
  issues: ValidationIssue[]
): string | undefined {
  const text = readOptionalText(value, field, 100, issues);
  if (!text) {
    return undefined;
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    issues.push({ field, message: "Must be a valid ISO date and time." });
    return undefined;
  }
  return parsed.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
