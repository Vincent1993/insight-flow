export { createInsightCore } from "./createInsightCore.js";
export type {
  AiReplyInsertion,
  CreateCoreOptions,
  InsightCore,
  ModuleConversationState,
  ModuleViewBinding,
  ModuleViewPatch
} from "./types.js";

export { resolvePrompt, normalizePromptMode, normalizePromptPreset } from "./prompt/index.js";
export type { ResolvePromptParams } from "./prompt/index.js";

export { ComputeScheduler } from "./runtime/scheduler.js";
export type { ComputeBackend, SchedulerThresholds } from "./runtime/scheduler.js";
