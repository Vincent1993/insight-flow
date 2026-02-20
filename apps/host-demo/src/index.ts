import { createComputeEngine } from "@insight-flow/compute-engine";
import { createInsightCore } from "@insight-flow/core";
import { createPipeline } from "@insight-flow/data-cleaner";
import { normalize, piiMask, sanitize } from "@insight-flow/data-cleaner/plugins";
import { collectStreamResult, type ChatChunk, type InsightChatConnector } from "@insight-flow/llm-connectors";
import type { InsightRecord, PromptMode } from "@insight-flow/protocol";

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
  private readonly chatConnector: InsightChatConnector;

  constructor(chatConnector: InsightChatConnector = createMockConnector()) {
    this.chatConnector = chatConnector;
  }

  /**
   * 注册模块并绑定页面回写能力。
   */
  async registerModule(module: ModuleCard): Promise<void> {
    this.pageModules.set(module.id, module);
    const cleaned = (await this.cleaner.run(
      {
        title: module.title,
        points: module.points,
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
      identity: { id: module.id, type: "metric-card", page: "home" },
      semantics: { domain: "sales", metric: "revenue", dimensions: ["region"] },
      stateTrace: { filters: module.filters, granularity: "day" },
      promptPreset: {
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

  discoverModules(): InsightRecord[] {
    return this.core.list();
  }

  selectModule(identityId: string): void {
    this.core.select(identityId);
  }

  /**
   * 触发侧边栏会话，并把 sessionId + AI 回复反向写回页面模块。
   */
  async chatOnSelectedModule(input: ChatInput): Promise<{ sessionId: string; reply: string }> {
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

    return {
      sessionId,
      reply: result.reply
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
    await this.core.requestModuleUpdate(identityId, {
      title: module.title,
      points: module.points
    });

    const summary = await this.compute.summarize(nextPoints);
    const trend = await this.compute.trend(nextPoints);
    const outliers = await this.compute.outliers(nextPoints);
    this.core.update(identityId, {
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

  await runtime.registerModule({
    id: "revenue-card",
    title: "本周收入",
    points: [100, 120, 115, 130, 150],
    filters: ["region=APAC"]
  });

  runtime.selectModule("revenue-card");
  await runtime.chatOnSelectedModule({
    identityId: "revenue-card",
    userInput: "解释本周收入变化，并给出下周动作建议。",
    promptMode: "append"
  });

  await runtime.clickUpdate("revenue-card", [110, 118, 122, 140, 160]);
}
