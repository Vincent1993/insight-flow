import type { InsightRecord } from "@insight-flow/protocol";
import type { InsightCore } from "../../types.js";

export type WrapElementRecord = Omit<InsightRecord, "timestamp">;

export function wrapElement(
  element: HTMLElement,
  core: InsightCore,
  record: WrapElementRecord
): () => void {
  const identityId = record.identity.id;
  element.dataset.insightId = identityId;

  core.register({
    ...record,
    timestamp: Date.now()
  });

  const onClick = (): void => {
    core.select(identityId);
  };

  element.addEventListener("click", onClick);

  return () => {
    element.removeEventListener("click", onClick);
    delete element.dataset.insightId;
    core.unregister(identityId);
  };
}
