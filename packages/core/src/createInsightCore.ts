import { INSIGHT_EVENTS, type InsightEventName, type InsightRecord, type PromptOverride } from "@insight-flow/protocol";
import { assertPromptOverride, assertPromptPreset, resolvePrompt } from "./prompt/index.js";
import { DiscoveryChannel } from "./runtime/discovery.js";
import { InsightMessenger } from "./runtime/messenger.js";
import { InsightRegistry } from "./runtime/registry.js";
import { StateBus } from "./runtime/state-bus.js";
import type {
  AiReplyInsertion,
  CreateCoreOptions,
  InsightCore,
  ModuleConversationState,
  ModuleViewBinding
} from "./types.js";

function mergePayloadWithConversation(
  payload: unknown,
  conversation: ModuleConversationState
): unknown {
  const patch = {
    __insightChat: conversation
  };
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return {
      ...(payload as Record<string, unknown>),
      ...patch
    };
  }
  return {
    value: payload,
    ...patch
  };
}

class InsightCoreRuntime implements InsightCore {
  private readonly registry = new InsightRegistry();
  private readonly selectedIds = new Set<string>();
  private readonly promptOverrides = new Map<string, PromptOverride>();
  private readonly moduleViewBindings = new Map<string, ModuleViewBinding>();
  private readonly conversations = new Map<string, ModuleConversationState>();
  private readonly selectionBus = new StateBus<InsightRecord[]>([]);
  private readonly registryBus = new StateBus<InsightRecord[]>([]);
  private readonly conversationBus = new StateBus<Record<string, ModuleConversationState>>({});
  private readonly messenger = new InsightMessenger();
  private readonly discovery: DiscoveryChannel;
  private readonly appId: string;

  constructor(options: CreateCoreOptions) {
    this.appId = options.appId;
    this.discovery = new DiscoveryChannel(options.discovery);
  }

  register(record: InsightRecord): void {
    assertPromptPreset(record.promptPreset);
    this.registry.upsert(record);
    this.publishRegistry();
    this.emit(INSIGHT_EVENTS.ITEM_REGISTERED, record);
  }

  unregister(identityId: string): void {
    this.registry.remove(identityId);
    this.selectedIds.delete(identityId);
    this.promptOverrides.delete(identityId);
    this.moduleViewBindings.delete(identityId);
    this.conversations.delete(identityId);
    this.publishRegistry();
    this.publishSelection();
    this.publishConversation();
    this.emit(INSIGHT_EVENTS.ITEM_UNREGISTERED, { identityId });
  }

  update(identityId: string, patch: Partial<InsightRecord>): void {
    const current = this.registry.get(identityId);
    if (!current) {
      throw new Error(`IF-CORE-002: cannot update unknown record (${identityId})`);
    }
    const merged: InsightRecord = {
      ...current,
      ...patch,
      identity: {
        ...current.identity,
        ...patch.identity,
        id: current.identity.id
      },
      semantics: {
        ...current.semantics,
        ...patch.semantics
      },
      stateTrace: {
        ...current.stateTrace,
        ...patch.stateTrace
      },
      promptPreset: {
        ...current.promptPreset,
        ...patch.promptPreset
      },
      timestamp: Date.now()
    };
    assertPromptPreset(merged.promptPreset);
    this.registry.upsert(merged);
    this.publishRegistry();
    this.publishSelection();
    this.emit(INSIGHT_EVENTS.ITEM_UPDATED, merged);
  }

  select(identityId: string): void {
    if (!this.registry.has(identityId)) {
      return;
    }
    this.selectedIds.clear();
    this.selectedIds.add(identityId);
    this.publishSelection();
  }

  clearSelection(): void {
    this.selectedIds.clear();
    this.publishSelection();
  }

  list(): InsightRecord[] {
    return this.registry.list();
  }

  get(identityId: string): InsightRecord | undefined {
    return this.registry.get(identityId);
  }

  subscribeSelection(cb: (records: InsightRecord[]) => void): () => void {
    return this.selectionBus.subscribe(cb);
  }

  subscribeRegistry(cb: (records: InsightRecord[]) => void): () => void {
    return this.registryBus.subscribe(cb);
  }

  setPromptOverride(identityId: string, override: PromptOverride): void {
    if (!this.registry.has(identityId)) {
      throw new Error(`IF-CORE-002: cannot set prompt override for unknown record (${identityId})`);
    }
    assertPromptOverride(override);
    this.promptOverrides.set(identityId, override);
    this.emit(INSIGHT_EVENTS.PROMPT_OVERRIDE_CHANGED, {
      identityId,
      override
    });
  }

  clearPromptOverride(identityId: string): void {
    this.promptOverrides.delete(identityId);
    this.emit(INSIGHT_EVENTS.PROMPT_OVERRIDE_CHANGED, {
      identityId,
      override: null
    });
  }

  getEffectivePrompt(identityId: string, userInput: string): string {
    const record = this.registry.get(identityId);
    if (!record) {
      throw new Error(`IF-CORE-002: unknown record (${identityId})`);
    }
    const override = this.promptOverrides.get(identityId);
    return resolvePrompt({
      preset: record.promptPreset,
      override,
      userInput
    });
  }

  bindModuleView(identityId: string, binding: ModuleViewBinding): () => void {
    if (!this.registry.has(identityId)) {
      throw new Error(`IF-CORE-002: cannot bind view for unknown record (${identityId})`);
    }
    this.moduleViewBindings.set(identityId, binding);
    return () => {
      this.moduleViewBindings.delete(identityId);
    };
  }

  insertAiReply(identityId: string, insertion: AiReplyInsertion): void {
    const record = this.registry.get(identityId);
    if (!record) {
      throw new Error(`IF-CORE-002: cannot insert ai reply for unknown record (${identityId})`);
    }
    if (!insertion.sessionId?.trim() || !insertion.reply?.trim()) {
      throw new Error("IF-CHAT-004: sessionId and reply are required");
    }

    const conversation: ModuleConversationState = {
      sessionId: insertion.sessionId,
      reply: insertion.reply,
      updatedAt: insertion.updatedAt ?? Date.now()
    };
    this.conversations.set(identityId, conversation);

    const binding = this.moduleViewBindings.get(identityId);
    binding?.applyChatPatch?.(conversation);

    this.update(identityId, {
      payload: mergePayloadWithConversation(record.payload, conversation)
    });
    this.publishConversation();
    this.emit(INSIGHT_EVENTS.AI_REPLY_INSERTED, {
      identityId,
      conversation
    });
  }

  getConversation(identityId: string): ModuleConversationState | undefined {
    return this.conversations.get(identityId);
  }

  subscribeConversation(cb: (state: Record<string, ModuleConversationState>) => void): () => void {
    return this.conversationBus.subscribe(cb);
  }

  async requestModuleUpdate(identityId: string, nextPayload?: unknown): Promise<void> {
    const record = this.registry.get(identityId);
    if (!record) {
      throw new Error(`IF-CORE-002: cannot request update for unknown record (${identityId})`);
    }

    if (nextPayload !== undefined) {
      this.update(identityId, {
        payload: nextPayload
      });
    }

    const binding = this.moduleViewBindings.get(identityId);
    if (binding?.requestDataUpdate) {
      const result = await binding.requestDataUpdate();
      if (result !== undefined) {
        this.update(identityId, {
          payload: result
        });
      }
    }

    this.emit(INSIGHT_EVENTS.MODULE_UPDATE_REQUESTED, {
      identityId,
      timestamp: Date.now()
    });
  }

  private publishRegistry(): void {
    const next = this.registry.list();
    this.registryBus.publish(next);
  }

  private publishSelection(): void {
    const selected = Array.from(this.selectedIds)
      .map((id) => this.registry.get(id))
      .filter((record): record is InsightRecord => Boolean(record));

    this.selectionBus.publish(selected);
    this.emit(INSIGHT_EVENTS.SELECTION_CHANGED, selected);
  }

  private publishConversation(): void {
    const snapshot = Object.fromEntries(this.conversations.entries());
    this.conversationBus.publish(snapshot);
  }

  private emit<T>(eventName: InsightEventName, payload: T): void {
    this.messenger.publish(eventName, payload);
    this.discovery.broadcast({
      name: eventName,
      appId: this.appId,
      timestamp: Date.now(),
      payload
    });
  }
}

export function createInsightCore(options: CreateCoreOptions): InsightCore {
  if (!options.appId?.trim()) {
    throw new Error("IF-CORE-002: appId is required");
  }
  return new InsightCoreRuntime(options);
}
