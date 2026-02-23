import type { InsightRecord, PromptOverride } from "@insight-flow/protocol";

export interface CreateCoreOptions {
  appId: string;
  channel?: "native" | "extension";
  discovery?: {
    enableBroadcast?: boolean;
    scope?: "window" | "iframe" | "all";
  };
}

export interface AiReplyInsertion {
  sessionId: string;
  reply: string;
  updatedAt?: number;
}

export interface ModuleConversationState {
  sessionId: string;
  reply: string;
  updatedAt: number;
}

export interface ModuleViewPatch extends ModuleConversationState {}

export interface ModuleViewBinding {
  applyChatPatch?: (patch: ModuleViewPatch) => void;
  requestDataUpdate?: () => Promise<unknown> | unknown;
}

export interface InsightCore {
  register(record: InsightRecord): void;
  unregister(identityId: string): void;
  update(identityId: string, patch: Partial<InsightRecord>): void;

  select(identityId: string): void;
  clearSelection(): void;

  list(): InsightRecord[];
  get(identityId: string): InsightRecord | undefined;

  subscribeSelection(cb: (records: InsightRecord[]) => void): () => void;
  subscribeRegistry(cb: (records: InsightRecord[]) => void): () => void;

  setPromptOverride(identityId: string, override: PromptOverride): void;
  clearPromptOverride(identityId: string): void;
  getEffectivePrompt(identityId: string, userInput: string): string;

  bindModuleView(identityId: string, binding: ModuleViewBinding): () => void;
  insertAiReply(identityId: string, insertion: AiReplyInsertion): void;
  getConversation(identityId: string): ModuleConversationState | undefined;
  subscribeConversation(
    cb: (state: Record<string, ModuleConversationState>) => void
  ): () => void;

  requestModuleUpdate(identityId: string, nextPayload?: unknown): Promise<void>;
}
