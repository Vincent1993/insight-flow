import type { EdgeStats, Identity, PromptPreset, Semantics, StateTrace } from "@insight-flow/protocol";
import type { InsightCore } from "../../types.js";

export interface InsightItemProps {
  identity: Identity;
  semantics: Semantics;
  stateTrace?: StateTrace;
  promptPreset: PromptPreset;
  payload?: unknown;
  edgeStats?: EdgeStats;
  children: unknown;
}

/**
 * 占位组件：保留与文档一致的 API 形态。
 * 实际项目中建议通过框架适配层（hook/effect）在挂载时调用 registerInsightItem。
 */
export function InsightItem(props: InsightItemProps): unknown {
  return props.children;
}

/**
 * React 场景的最小注册助手：UI 层可在 useEffect 中调用。
 */
export function registerInsightItem(core: InsightCore, props: InsightItemProps): () => void {
  core.register({
    identity: props.identity,
    semantics: props.semantics,
    stateTrace: props.stateTrace ?? {},
    promptPreset: props.promptPreset,
    payload: props.payload,
    edgeStats: props.edgeStats,
    timestamp: Date.now()
  });

  return () => {
    core.unregister(props.identity.id);
  };
}
