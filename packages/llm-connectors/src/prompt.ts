import type { InsightRecord, PromptMode } from "@insight-flow/protocol";
import type { ChatRequest } from "./types.js";

function renderPreset(record: InsightRecord): string {
  const preset = record.promptPreset;
  const lines: string[] = [
    `System: ${preset.system}`,
    `Task: ${preset.task}`
  ];
  if (preset.output) {
    lines.push(`Output: ${preset.output}`);
  }
  if (preset.constraints?.length) {
    lines.push(`Constraints: ${preset.constraints.join(" | ")}`);
  }
  return lines.join("\n");
}

function resolveMode(record: InsightRecord, mode?: PromptMode): PromptMode {
  return mode ?? record.promptPreset.defaultMode ?? "append";
}

export function getSelectedRecord(req: ChatRequest): InsightRecord {
  const selected = req.records.find((record) => record.identity.id === req.identityId);
  if (!selected) {
    throw new Error("IF-CHAT-003: identityId must exist in records");
  }
  return selected;
}

export function buildEffectivePrompt(req: ChatRequest): string {
  if (!req.userInput?.trim()) {
    throw new Error("IF-CHAT-004: userInput is required");
  }

  const record = getSelectedRecord(req);
  const mode = resolveMode(record, req.promptMode);
  const input = req.userInput.trim();

  if (mode === "replace") {
    const overridePrompt = req.overridePrompt?.trim();
    if (!overridePrompt) {
      throw new Error("IF-PROMPT-002: replace mode requires overridePrompt");
    }
    return `${overridePrompt}\n\nUserInput: ${input}`;
  }

  const preset = renderPreset(record);
  const userPrompt = req.overridePrompt?.trim();
  if (!userPrompt) {
    return `${preset}\n\nUserInput: ${input}`;
  }
  return `${preset}\n\nUserPrompt: ${userPrompt}\n\nUserInput: ${input}`;
}
