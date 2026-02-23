import type { CleanerPlugin } from "../types.js";

export interface SanitizeOptions {
  /**
   * 无效数值替换值，默认 null。
   */
  invalidNumberFallback?: number | null;
}

function sanitizeValue(value: unknown, options: SanitizeOptions): unknown {
  if (typeof value === "number" && Number.isNaN(value)) {
    return options.invalidNumberFallback ?? null;
  }
  if (value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, options));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = sanitizeValue(item, options);
    }
    return output;
  }
  return value;
}

export function sanitize(options: SanitizeOptions = {}): CleanerPlugin {
  return (input: unknown) => sanitizeValue(input, options);
}
