import type { PromptOverride, PromptPreset } from "@insight-flow/protocol";
import { normalizePromptMode } from "./override.js";
import { normalizePromptPreset } from "./preset.js";

export interface ResolvePromptParams {
  preset: PromptPreset;
  override?: PromptOverride;
  userInput: string;
}

function renderPreset(preset: PromptPreset): string {
  const lines: string[] = [];
  lines.push(`System: ${preset.system}`);
  lines.push(`Task: ${preset.task}`);
  if (preset.output) {
    lines.push(`Output: ${preset.output}`);
  }
  if (preset.constraints?.length) {
    lines.push(`Constraints: ${preset.constraints.join(" | ")}`);
  }
  return lines.join("\n");
}

export function resolvePrompt(params: ResolvePromptParams): string {
  const normalizedPreset = normalizePromptPreset(params.preset);
  const mode = normalizePromptMode(params.override?.mode ?? normalizedPreset.defaultMode);

  const normalizedInput = params.userInput?.trim();
  if (!normalizedInput) {
    throw new Error("IF-PROMPT-002: user input is required");
  }

  if (mode === "replace") {
    const overrideText = params.override?.text?.trim();
    if (!overrideText) {
      throw new Error("IF-PROMPT-002: replace mode requires override text");
    }
    return `${overrideText}\n\nUserInput: ${normalizedInput}`;
  }

  const presetPart = renderPreset(normalizedPreset);
  const overridePart = params.override?.text?.trim() ?? "";

  if (!overridePart) {
    return `${presetPart}\n\nUserInput: ${normalizedInput}`;
  }

  return `${presetPart}\n\nUserPrompt: ${overridePart}\n\nUserInput: ${normalizedInput}`;
}
