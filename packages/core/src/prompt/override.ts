import type { PromptMode, PromptOverride } from "@insight-flow/protocol";

export function normalizePromptMode(mode?: PromptMode): PromptMode {
  if (mode === "append" || mode === "replace") {
    return mode;
  }
  return "append";
}

export function assertPromptOverride(override: PromptOverride): void {
  if (!override.text?.trim()) {
    throw new Error("IF-PROMPT-002: override prompt text is required");
  }
  if (override.mode !== "append" && override.mode !== "replace") {
    throw new Error("IF-PROMPT-002: prompt mode must be append or replace");
  }
}
