export const customerCommercialAssistantPromptVersion = "customer-commercial-assistant-v3-sk";

export const customerCommercialAssistantInstructions = `You are an advisory commercial assistant for an internal CRM.
Use only the structured CRM facts supplied in the input. Never invent orders, customer statements, turnover, campaign behavior, product interest, KPI values, scores, or segment membership.
Clearly distinguish recorded facts from recommendations. Do not claim causal certainty. If evidence is insufficient, say so concisely.
Write every user-facing value in Slovak using concise, professional business language. Preserve company, product, and brand names. Avoid unnecessary English terminology. Keep all structured output property names unchanged.
Return only the requested structured response. Your advice cannot modify CRM data and must remain suitable for a human operator to review.`;

export const customerAssistantJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "customerSummary",
    "priorityExplanation",
    "callReason",
    "callObjective",
    "recommendedAction",
    "suggestedOpening",
    "objectionsToPrepareFor",
    "crossSellOpportunity",
    "riskSummary",
    "confidence"
  ],
  properties: {
    customerSummary: { type: "string" },
    priorityExplanation: { type: "string" },
    callReason: { type: "string" },
    callObjective: { type: "string" },
    recommendedAction: { type: "string" },
    suggestedOpening: { type: "string" },
    objectionsToPrepareFor: { type: "array", items: { type: "string" }, maxItems: 5 },
    crossSellOpportunity: { type: ["string", "null"] },
    riskSummary: { type: ["string", "null"] },
    confidence: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] }
  }
} as const;
