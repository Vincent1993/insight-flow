import type { PromptPreset } from "@insight-flow/protocol";
import { mergePromptLayers } from "./library.js";

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
  const layered = mergePromptLayers(preset);
  const constraints = layered.constraints?.filter((item) => item.trim().length > 0);
  return {
    ...layered,
    constraints,
    defaultMode: layered.defaultMode ?? "append"
  };
}
