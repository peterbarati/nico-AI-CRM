import { taskPriorityCodes, type TaskPriorityCode, type ValidationIssue } from "./call-workflow";

export const salesVisitStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export const salesVisitResultCodes = [
  "ORDER",
  "INTERESTED",
  "NO_INTEREST",
  "FOLLOW_UP",
  "BRANDING",
  "STOCK_CHECK",
  "B2B_REGISTRATION",
  "CUSTOMER_CLOSED",
  "OTHER"
] as const;
export const visitNextActionCodes = [
  "NONE",
  "SALES_FOLLOW_UP",
  "ANOTHER_SALES_VISIT",
  "CUSTOMER_SERVICE_CALL",
  "SEND_INFORMATION",
  "B2B_REGISTRATION",
  "REORDER_FOLLOW_UP"
] as const;

export type SalesVisitStatus = (typeof salesVisitStatuses)[number];
export type SalesVisitResultCode = (typeof salesVisitResultCodes)[number];
export type VisitNextActionCode = (typeof visitNextActionCodes)[number];

export interface ScheduleSalesVisitRequest {
  plannedAt: string;
  customerLocationId?: string;
  notes?: string;
  idempotencyKey: string;
}

export interface CompleteSalesVisitRequest {
  result: SalesVisitResultCode;
  notes?: string;
  orderValue?: number;
  nextAction: VisitNextActionCode;
  followUpAt?: string;
  priority?: TaskPriorityCode;
  idempotencyKey: string;
}

export type SalesWorkflowValidationResult<T> =
  { success: true; data: T } | { success: false; issues: ValidationIssue[] };

export function validateScheduleSalesVisitRequest(
  value: unknown,
  now = new Date()
): SalesWorkflowValidationResult<ScheduleSalesVisitRequest> {
  if (!isRecord(value)) {
    return invalidBody();
  }
  const issues: ValidationIssue[] = [];
  const plannedAt = readDate(value.plannedAt, "plannedAt", issues);
  const customerLocationId = readText(value.customerLocationId, "customerLocationId", 100, issues);
  const notes = readText(value.notes, "notes", 4000, issues);
  const idempotencyKey = readIdempotencyKey(value.idempotencyKey, issues);

  if (plannedAt && new Date(plannedAt).getTime() <= now.getTime()) {
    issues.push({ field: "plannedAt", message: "Planned visit date must be in the future." });
  }
  if (issues.length > 0 || !plannedAt || !idempotencyKey) {
    return { success: false, issues };
  }
  return {
    success: true,
    data: {
      plannedAt,
      idempotencyKey,
      ...(customerLocationId ? { customerLocationId } : {}),
      ...(notes ? { notes } : {})
    }
  };
}

export function validateCompleteSalesVisitRequest(
  value: unknown,
  now = new Date()
): SalesWorkflowValidationResult<CompleteSalesVisitRequest> {
  if (!isRecord(value)) {
    return invalidBody();
  }
  const issues: ValidationIssue[] = [];
  const result = readEnum(value.result, salesVisitResultCodes, "result", issues);
  const nextAction = readEnum(value.nextAction, visitNextActionCodes, "nextAction", issues);
  const priority = value.priority
    ? readEnum(value.priority, taskPriorityCodes, "priority", issues)
    : "MEDIUM";
  const notes = readText(value.notes, "notes", 4000, issues);
  const followUpAt = value.followUpAt
    ? readDate(value.followUpAt, "followUpAt", issues)
    : undefined;
  const idempotencyKey = readIdempotencyKey(value.idempotencyKey, issues);
  const orderValue = readOptionalAmount(value.orderValue, issues);

  if (nextAction && nextAction !== "NONE") {
    if (!followUpAt) {
      issues.push({ field: "followUpAt", message: "Follow-up date is required for this action." });
    } else if (new Date(followUpAt).getTime() <= now.getTime()) {
      issues.push({ field: "followUpAt", message: "Follow-up date must be in the future." });
    }
  }
  if (issues.length > 0 || !result || !nextAction || !priority || !idempotencyKey) {
    return { success: false, issues };
  }
  return {
    success: true,
    data: {
      result,
      nextAction,
      priority,
      idempotencyKey,
      ...(notes ? { notes } : {}),
      ...(followUpAt ? { followUpAt } : {}),
      ...(orderValue !== undefined ? { orderValue } : {})
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

function readDate(value: unknown, field: string, issues: ValidationIssue[]): string | undefined {
  const text = readText(value, field, 100, issues);
  if (!text) {
    issues.push({ field, message: "Date and time are required." });
    return undefined;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    issues.push({ field, message: "Must be a valid ISO date and time." });
    return undefined;
  }
  return date.toISOString();
}

function readText(
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
  const text = value.trim();
  if (text.length > maxLength) {
    issues.push({ field, message: `Must not exceed ${maxLength} characters.` });
    return undefined;
  }
  return text || undefined;
}

function readIdempotencyKey(value: unknown, issues: ValidationIssue[]): string | undefined {
  const key = readText(value, "idempotencyKey", 100, issues);
  if (!key || key.length < 8) {
    issues.push({
      field: "idempotencyKey",
      message: "Idempotency key must contain at least 8 characters."
    });
    return undefined;
  }
  return key;
}

function readOptionalAmount(value: unknown, issues: ValidationIssue[]): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    issues.push({ field: "orderValue", message: "Order value must be a non-negative number." });
    return undefined;
  }
  return value;
}

function invalidBody(): SalesWorkflowValidationResult<never> {
  return { success: false, issues: [{ field: "body", message: "A JSON object is required." }] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
