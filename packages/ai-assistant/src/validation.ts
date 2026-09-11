import type { CustomerAssistantOutput } from "./types";

export function validateCustomerAssistantOutput(value: unknown): CustomerAssistantOutput {
  if (!isRecord(value)) throw new Error("AI response must be an object.");
  const required = [
    "customerSummary",
    "priorityExplanation",
    "callReason",
    "callObjective",
    "recommendedAction",
    "suggestedOpening"
  ] as const;
  const allowed = new Set([
    ...required,
    "objectionsToPrepareFor",
    "crossSellOpportunity",
    "riskSummary",
    "confidence"
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error("AI response contains unsupported fields.");
  }
  for (const key of required) {
    if (
      typeof value[key] !== "string" ||
      value[key].trim().length === 0 ||
      value[key].length > 800
    ) {
      throw new Error(`AI response field ${key} is invalid.`);
    }
  }
  if (
    !Array.isArray(value.objectionsToPrepareFor) ||
    value.objectionsToPrepareFor.length > 5 ||
    !value.objectionsToPrepareFor.every((item) => typeof item === "string" && item.length <= 300)
  ) {
    throw new Error("AI response objectionsToPrepareFor is invalid.");
  }
  if (!isNullableString(value.crossSellOpportunity) || !isNullableString(value.riskSummary)) {
    throw new Error("AI response optional summaries are invalid.");
  }
  if (value.confidence !== "LOW" && value.confidence !== "MEDIUM" && value.confidence !== "HIGH") {
    throw new Error("AI response confidence is invalid.");
  }
  return value as unknown as CustomerAssistantOutput;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length <= 800);
}
