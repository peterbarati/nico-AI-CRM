import { customerAssistantJsonSchema, customerCommercialAssistantInstructions } from "./prompt";
import type {
  AIProvider,
  AIProviderOptions,
  AIProviderResult,
  CustomerAssistantContext
} from "./types";
import { validateCustomerAssistantOutput } from "./validation";

export class OpenAIProvider implements AIProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async generateCustomerAssistance(
    context: CustomerAssistantContext,
    options: AIProviderOptions
  ): Promise<AIProviderResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await this.fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: options.model,
          instructions: customerCommercialAssistantInstructions,
          input: JSON.stringify(context),
          max_output_tokens: options.maxOutputTokens,
          store: false,
          text: {
            format: {
              type: "json_schema",
              name: "customer_commercial_assistant",
              strict: true,
              schema: customerAssistantJsonSchema
            }
          }
        })
      });
      if (!response.ok) throw new Error(`OpenAI provider returned ${response.status}.`);
      const body = (await response.json()) as {
        output_text?: string;
        output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const outputText =
        body.output_text ??
        body.output
          ?.flatMap((item) => item.content ?? [])
          .find((item) => item.type === "output_text")?.text;
      if (!outputText) throw new Error("OpenAI provider returned no structured output.");
      let parsed: unknown;
      try {
        parsed = JSON.parse(outputText);
      } catch {
        throw new Error("OpenAI provider returned invalid JSON.");
      }
      return {
        provider: "OPENAI",
        model: options.model,
        output: validateCustomerAssistantOutput(parsed),
        inputTokens: body.usage?.input_tokens,
        outputTokens: body.usage?.output_tokens
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
