import type { CleanerPlugin } from "../types.js";

export interface DedupeOptions {
  /**
   * 针对对象数组时的唯一键。
   */
  key?: string;
}

export function dedupe(options: DedupeOptions = {}): CleanerPlugin {
  return (input: unknown) => {
    if (!Array.isArray(input)) {
      return input;
    }

    if (!options.key) {
      return Array.from(new Set(input.map((item) => JSON.stringify(item)))).map((item) =>
        JSON.parse(item) as unknown
      );
    }

    const seen = new Set<string>();
    const result: unknown[] = [];
    for (const item of input) {
      if (!item || typeof item !== "object") {
        result.push(item);
        continue;
      }
      const keyValue = (item as Record<string, unknown>)[options.key];
      const token = String(keyValue);
      if (seen.has(token)) {
        continue;
      }
      seen.add(token);
      result.push(item);
    }
    return result;
  };
}
