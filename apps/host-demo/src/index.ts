import { createComputeEngine } from "@insight-flow/compute-engine";
import { createInsightCore, type ModuleConversationState } from "@insight-flow/core";
import { createAdapterRegistry, createPipeline } from "@insight-flow/data-cleaner";
import { normalize, piiMask, sanitize } from "@insight-flow/data-cleaner/plugins";
import {
  createInterpretationCache,
  createMd5Fingerprint,
  createMemoryKvStore,
  type InterpretationCacheLookup
} from "@insight-flow/fingerprint-cache";
import { collectStreamResult, type ChatChunk, type InsightChatConnector } from "@insight-flow/llm-connectors";
import type { InsightRecord, PromptMode, PromptTemplateType } from "@insight-flow/protocol";
import { createDemoAdapters, type AdaptedModuleData } from "./adapters.js";

interface ModuleCard {
  id: string;
  title: string;
  points: number[];
  filters: string[];
  sessionId?: string;
  aiReply?: string;
  lastUpdatedAt?: number;
}

interface ChatInput {
  identityId: string;
  userInput: string;
  promptMode?: PromptMode;
  overridePrompt?: string;
  forceReinterpret?: boolean;
}

type ChatResultStatus = "cache_hit" | "generated" | "stale";

interface ChatResult {
  status: ChatResultStatus;
  sessionId?: string;
  reply?: string;
  fingerprint: string;
  hint?: string;
}

interface RegisterMetadata {
  adapterId?: string;
  schemaId?: string;
  schemaVersion?: string;
  templateType?: PromptTemplateType;
  itemType?: string;
  metric?: string;
}

function createMockConnector(): InsightChatConnector {
  return {
    async *streamChat(req): AsyncIterable<ChatChunk> {
      const sessionId = `mock-session-${Date.now()}`;
      yield { text: "已收到你的问题。", sessionId };
      yield { text: "当前模块趋势有上行迹象，建议关注异常峰值来源。", sessionId };
      yield {
        text: "",
        done: true,
        sessionId,
        usage: { promptTokens: 120, completionTokens: 64 }
      };
      void req;
    }
  };
}

export class HostDemoRuntime {
  private readonly pageModules = new Map<string, ModuleCard>();
  private readonly adapters = createAdapterRegistry(createDemoAdapters());
  private readonly core = createInsightCore({
    appId: "host-demo",
    channel: "native",
    discovery: { enableBroadcast: false }
  });
  private readonly cleaner = createPipeline([
    normalize({ trimString: true }),
    sanitize(),
    piiMask({ fields: ["owner_id"] })
  ]);
  private readonly compute = createComputeEngine({
    mode: "auto",
    thresholds: {
      jsMaxPoints: 10,
      workerMaxPoints: 100
    }
  });
  private readonly interpretationCache = createInterpretationCache(createMemoryKvStore(), {
    ttlMs: 30 * 60 * 1000
  });
  private readonly chatConnector: InsightChatConnector;

  constructor(chatConnector: InsightChatConnector = createMockConnector()) {
    this.chatConnector = chatConnector;
  }

  /**
   * 注册模块并绑定页面回写能力。
   */
  async registerModule(module: ModuleCard, metadata?: RegisterMetadata): Promise<void> {
    this.pageModules.set(module.id, module);
    const modulePayload = {
      title: module.title,
      points: module.points
    };
    const fingerprint = createMd5Fingerprint(modulePayload);
    const cleaned = (await this.cleaner.run(
      {
        ...modulePayload,
        owner_id: "U-10086"
      },
      {
        identity: { id: module.id, type: "metric-card", page: "home" },
        semantics: { domain: "sales", metric: "revenue" }
      }
    )) as { title: string; points: number[] };

    const summary = await this.compute.summarize(cleaned.points);
    const trend = await this.compute.trend(cleaned.points);
    const outliers = await this.compute.outliers(cleaned.points);

    const record: InsightRecord = {
      identity: { id: module.id, type: metadata?.itemType ?? "metric-card", page: "home" },
      semantics: {
        domain: "sales",
        metric: metadata?.metric ?? "revenue",
        dimensions: ["region"]
      },
      stateTrace: {
        filters: module.filters,
        granularity: "day",
        ext: metadata
          ? {
              adapterId: metadata.adapterId,
              schemaId: metadata.schemaId,
              schemaVersion: metadata.schemaVersion,
              fingerprint
            }
          : undefined
      },
      promptPreset: {
        templateType: metadata?.templateType ?? "indicator",
        system: "你是业务分析助手，请先引用确定性统计量再给结论。",
        task: `分析模块 ${module.title} 的指标变化并给出建议。`,
        output: "输出结构：结论 / 证据 / 建议",
        defaultMode: "append"
      },
      payload: {
        title: cleaned.title,
        points: cleaned.points
      },
      edgeStats: {
        mean: summary.mean,
        min: summary.min,
        max: summary.max,
        variance: summary.variance,
        slope: trend.slope,
        outliers: outliers.indexes
      },
      timestamp: Date.now()
    };

    this.core.register(record);

    this.core.bindModuleView(module.id, {
      applyChatPatch: (patch) => {
        const current = this.pageModules.get(module.id);
        if (!current) {
          return;
        }
        current.sessionId = patch.sessionId;
        current.aiReply = patch.reply;
        current.lastUpdatedAt = patch.updatedAt;
      },
      requestDataUpdate: () => {
        const current = this.pageModules.get(module.id);
        if (!current) {
          return undefined;
        }
        return {
          title: current.title,
          points: current.points
        };
      }
    });
  }

  /**
   * 注入异构数据并通过 Adapter 自动适配后注册。
   */
  async registerInjectedModule(rawInput: unknown, adapterId?: string): Promise<void> {
    const adapted = await this.adapters.adapt<AdaptedModuleData>(rawInput, {
      adapterId,
      includeRaw: true
    });
    await this.registerModule(
      {
        id: adapted.data.id,
        title: adapted.data.title,
        points: adapted.data.points,
        filters: adapted.data.filters
      },
      {
        adapterId: adapted.adapterId,
        schemaId: adapted.schema.id,
        schemaVersion: adapted.schema.version,
        templateType: adapted.schema.id === "trend-rows" ? "trend" : "indicator",
        itemType: adapted.schema.id === "trend-rows" ? "trend-chart" : "metric-card",
        metric: adapted.schema.id === "trend-rows" ? "order_count" : "revenue"
      }
    );
  }

  discoverModules(): InsightRecord[] {
    return this.core.list();
  }

  subscribeSelection(cb: (records: InsightRecord[]) => void): () => void {
    return this.core.subscribeSelection(cb);
  }

  subscribeConversation(cb: (state: Record<string, ModuleConversationState>) => void): () => void {
    return this.core.subscribeConversation(cb);
  }

  async checkInterpretationStatus(identityId: string): Promise<InterpretationCacheLookup> {
    const record = this.core.get(identityId);
    if (!record) {
      throw new Error(`record not found: ${identityId}`);
    }
    const fingerprint = createMd5Fingerprint(record.payload ?? {});
    return this.interpretationCache.getStatus(identityId, fingerprint);
  }

  selectModule(identityId: string): void {
    this.core.select(identityId);
  }

  /**
   * 触发侧边栏会话，并把 sessionId + AI 回复反向写回页面模块。
   */
  async chatOnSelectedModule(input: ChatInput): Promise<ChatResult> {
    const currentRecord = this.core.get(input.identityId);
    if (!currentRecord) {
      throw new Error(`record not found: ${input.identityId}`);
    }
    const fingerprint = createMd5Fingerprint(currentRecord.payload ?? {});
    const cacheLookup = await this.interpretationCache.getStatus(input.identityId, fingerprint);

    if (!input.forceReinterpret) {
      if (cacheLookup.status === "hit" && cacheLookup.entry) {
        this.core.insertAiReply(input.identityId, {
          sessionId: cacheLookup.entry.sessionId ?? `cache-session-${Date.now()}`,
          reply: cacheLookup.entry.reply,
          updatedAt: cacheLookup.entry.createdAt
        });
        return {
          status: "cache_hit",
          sessionId: cacheLookup.entry.sessionId,
          reply: cacheLookup.entry.reply,
          fingerprint
        };
      }
      if (cacheLookup.status === "stale") {
        return {
          status: "stale",
          fingerprint,
          hint: "数据已更新，请点击重新解读。"
        };
      }
    }

    const records = this.core.list();
    const stream = this.chatConnector.streamChat({
      identityId: input.identityId,
      records,
      userInput: input.userInput,
      promptMode: input.promptMode,
      overridePrompt: input.overridePrompt
    });

    const result = await collectStreamResult(stream);
    const sessionId = result.sessionId ?? `local-session-${Date.now()}`;
    this.core.insertAiReply(input.identityId, {
      sessionId,
      reply: result.reply
    });
    await this.interpretationCache.set(input.identityId, fingerprint, {
      sessionId,
      reply: result.reply,
      metadata: {
        source: "dify"
      }
    });

    return {
      status: "generated",
      sessionId,
      reply: result.reply,
      fingerprint
    };
  }

  /**
   * 页面点击“更新”后的标准流程：
   * 更新数据 -> 触发 core 更新 -> 重新计算统计量。
   */
  async clickUpdate(identityId: string, nextPoints: number[]): Promise<void> {
    const module = this.pageModules.get(identityId);
    if (!module) {
      throw new Error(`module not found: ${identityId}`);
    }

    module.points = nextPoints;
    const updatedPayload = {
      title: module.title,
      points: module.points
    };
    const nextFingerprint = createMd5Fingerprint(updatedPayload);
    await this.core.requestModuleUpdate(identityId, {
      ...updatedPayload
    });

    const summary = await this.compute.summarize(nextPoints);
    const trend = await this.compute.trend(nextPoints);
    const outliers = await this.compute.outliers(nextPoints);
    const currentRecord = this.core.get(identityId);
    const currentExt = (currentRecord?.stateTrace.ext ?? {}) as Record<string, unknown>;
    this.core.update(identityId, {
      stateTrace: {
        ext: {
          ...currentExt,
          fingerprint: nextFingerprint,
          updatedAt: Date.now()
        }
      },
      edgeStats: {
        mean: summary.mean,
        min: summary.min,
        max: summary.max,
        variance: summary.variance,
        slope: trend.slope,
        outliers: outliers.indexes
      }
    });
  }

  getPageModule(identityId: string): ModuleCard | undefined {
    const current = this.pageModules.get(identityId);
    return current ? { ...current } : undefined;
  }
}

/**
 * 最小演示流程（可用于手工联调）。
 */
export async function runDemoFlow(): Promise<void> {
  const runtime = new HostDemoRuntime();

  await runtime.registerInjectedModule({
    moduleId: "revenue-card",
    moduleName: "本周收入",
    series: [100, 120, 115, 130, 150],
    filters: ["region=APAC"]
  });

  await runtime.registerInjectedModule({
    id: "order-trend",
    title: "订单趋势",
    rows: [
      { x: "Mon", y: 20 },
      { x: "Tue", y: 22 },
      { x: "Wed", y: 28 }
    ],
    context: {
      filters: ["channel=online"]
    }
  });

  runtime.selectModule("revenue-card");
  await runtime.chatOnSelectedModule({
    identityId: "revenue-card",
    userInput: "解释本周收入变化，并给出下周动作建议。",
    promptMode: "append"
  });

  await runtime.clickUpdate("revenue-card", [110, 118, 122, 140, 160]);
}
