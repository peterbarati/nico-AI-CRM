import { sk, type TranslationKey } from "./sk";
export * from "./config";

export function t(key: TranslationKey, values?: Record<string, string | number>): string {
  let translated: string = sk[key] ?? key;
  if (!values) return translated;
  for (const [name, value] of Object.entries(values)) {
    translated = translated.replaceAll(`{${name}}`, String(value));
  }
  return translated;
}

export * from "./formatters";
export * from "./mappings";
