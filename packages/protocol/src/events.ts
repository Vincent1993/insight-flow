export interface InsightEvent<T = unknown> {
  name: string;
  appId: string;
  version: string;
  timestamp: number;
  payload: T;
}

export const INSIGHT_EVENTS = {
  ITEM_REGISTERED: "insight:item-registered",
  ITEM_UPDATED: "insight:item-updated",
  ITEM_UNREGISTERED: "insight:item-unregistered",
  SELECTION_CHANGED: "insight:selection-changed",
  PROMPT_OVERRIDE_CHANGED: "insight:prompt-override-changed",
  AI_REPLY_INSERTED: "insight:ai-reply-inserted",
  MODULE_UPDATE_REQUESTED: "insight:module-update-requested",
  CHAT_STARTED: "insight:chat-started",
  CHAT_FINISHED: "insight:chat-finished"
} as const;

export type InsightEventName = (typeof INSIGHT_EVENTS)[keyof typeof INSIGHT_EVENTS];
