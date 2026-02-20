import type { PromptPreset } from "@insight-flow/protocol";

export function assertPromptPreset(preset: PromptPreset): void {
  if (!preset.system?.trim()) {
    throw new Error("IF-PROMPT-001: promptPreset.system is required");
  }
  if (!preset.task?.trim()) {
    throw new Error("IF-PROMPT-001: promptPreset.task is required");
  }
}

export function normalizePromptPreset(preset: PromptPreset): PromptPreset {
  assertPromptPreset(preset);
  return {
    ...preset,
    defaultMode: preset.defaultMode ?? "append"
  };
}
