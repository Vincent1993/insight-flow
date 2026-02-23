import type { CleanerPlugin } from "../types.js";

export interface NormalizeOptions {
  /**
   * 字段映射：旧字段名 -> 新字段名。
   */
  fieldMap?: Record<string, string>;
  /**
   * 将字符串首尾空白移除。
   */
  trimString?: boolean;
}

function mapObjectKeys(
  input: Record<string, unknown>,
  options: NormalizeOptions
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  const fieldMap = options.fieldMap ?? {};

  for (const [key, value] of Object.entries(input)) {
    const targetKey = fieldMap[key] ?? key;
    if (typeof value === "string" && options.trimString) {
      output[targetKey] = value.trim();
      continue;
    }
    output[targetKey] = value;
  }
  return output;
}

export function normalize(options: NormalizeOptions = {}): CleanerPlugin {
  return (input: unknown) => {
    if (Array.isArray(input)) {
      return input.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? mapObjectKeys(item as Record<string, unknown>, options)
          : item
      );
    }
    if (input && typeof input === "object") {
      return mapObjectKeys(input as Record<string, unknown>, options);
    }
    return input;
  };
}
