import type { CleanerPlugin } from "../types.js";

export interface PiiMaskOptions {
  /**
   * 需要掩码的字段名列表。
   */
  fields: string[];
  /**
   * 掩码字符。
   */
  maskChar?: string;
}

function maskString(value: string, maskChar: string): string {
  if (value.length <= 2) {
    return maskChar.repeat(value.length);
  }
  const prefix = value.slice(0, 1);
  const suffix = value.slice(-1);
  return `${prefix}${maskChar.repeat(Math.max(1, value.length - 2))}${suffix}`;
}

function maskValue(
  value: unknown,
  fields: Set<string>,
  maskChar: string,
  currentKey?: string
): unknown {
  if (currentKey && fields.has(currentKey)) {
    if (typeof value === "string") {
      return maskString(value, maskChar);
    }
    if (typeof value === "number") {
      return Number.NaN;
    }
    return "***";
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, fields, maskChar));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = maskValue(entry, fields, maskChar, key);
    }
    return output;
  }

  return value;
}

export function piiMask(options: PiiMaskOptions): CleanerPlugin {
  const fields = new Set(options.fields);
  const maskChar = options.maskChar ?? "*";
  return (input: unknown) => maskValue(input, fields, maskChar);
}
