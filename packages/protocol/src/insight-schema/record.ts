import type { EdgeStats } from "./edge-stats.js";
import type { Identity } from "./identity.js";
import type { PromptPreset } from "./prompt.js";
import type { Semantics } from "./semantics.js";
import type { StateTrace } from "./state-trace.js";

export interface InsightRecord {
  identity: Identity;
  semantics: Semantics;
  stateTrace: StateTrace;
  promptPreset: PromptPreset;
  payload?: unknown;
  edgeStats?: EdgeStats;
  timestamp: number;
}
