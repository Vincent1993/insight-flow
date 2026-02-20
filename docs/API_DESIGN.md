# InsightFlow API 设计（API Design）

> 本文档定义 InsightFlow 的核心接口契约，确保宿主应用、侧边栏、插件与扩展能力间可稳定协作。

## 1. 设计原则

1. 协议优先：所有输入输出都以 `@insight-flow/protocol` 为准。
2. 可插拔：清洗、计算、AI 连接器均可替换。
3. 分层解耦：Core 不依赖具体 AI 厂商与后端实现。
4. 向后兼容：协议按语义化版本迭代。
5. 模块级 Prompt：每个注册模块都应声明内置分析提示词。

## 2. Protocol（核心类型）

```ts
export interface Identity {
  id: string;              // 全局唯一组件 ID
  type: string;            // metric-card / trend-chart / table...
  page?: string;           // 页面标识
}

export interface Semantics {
  domain?: string;         // sales / finance / ops
  metric?: string;         // revenue / order_count
  dimensions?: string[];   // region / channel
  tags?: string[];         // 业务标签
}

export interface StateTrace {
  filters?: string[];      // region=APAC
  dateRange?: string;      // last_7_days
  granularity?: string;    // day/week/month
  ext?: Record<string, unknown>;
}

export interface EdgeStats {
  mean?: number;
  min?: number;
  max?: number;
  variance?: number;
  slope?: number;
  outliers?: number[];
}

export type PromptMode = "append" | "replace";

export interface PromptPreset {
  system: string;                     // 角色与风格
  task: string;                       // 该模块默认分析任务
  output?: string;                    // 输出格式要求
  constraints?: string[];             // 禁止项/边界
  variables?: Record<string, string>; // 可注入变量
  defaultMode?: PromptMode;           // 默认 append
}

export interface PromptOverride {
  mode: PromptMode;
  text: string;                       // 用户追加或替换提示词
}

export interface InsightRecord {
  identity: Identity;
  semantics: Semantics;
  stateTrace: StateTrace;
  promptPreset: PromptPreset;
  payload?: unknown;
  edgeStats?: EdgeStats;
  timestamp: number;
}

export interface DataSchemaDescriptor {
  id: string;
  version: string;
  description?: string;
}

export interface DataAdapter<TInput = unknown, TOutput = unknown> {
  id: string;
  schema: DataSchemaDescriptor;
  canAdapt(input: unknown): input is TInput;
  adapt(input: TInput): TOutput | Promise<TOutput>;
}
```

## 3. Core API（@insight-flow/core）

### 3.1 创建 Runtime

```ts
interface CreateCoreOptions {
  appId: string;
  channel?: "native" | "extension";
  discovery?: {
    enableBroadcast?: boolean;
    scope?: "window" | "iframe" | "all";
  };
}

function createInsightCore(options: CreateCoreOptions): InsightCore;
```

### 3.2 Runtime 接口

```ts
interface InsightCore {
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

  bindModuleView(identityId: string, binding: {
    applyChatPatch?: (patch: {
      sessionId: string;
      reply: string;
      updatedAt: number;
    }) => void;
    requestDataUpdate?: () => Promise<unknown> | unknown;
  }): () => void;

  insertAiReply(identityId: string, insertion: {
    sessionId: string;
    reply: string;
    updatedAt?: number;
  }): void;

  requestModuleUpdate(identityId: string, nextPayload?: unknown): Promise<void>;
}
```

### 3.3 Wrapper API

React：

```ts
interface InsightItemProps {
  identity: Identity;
  semantics: Semantics;
  stateTrace?: StateTrace;
  promptPreset: PromptPreset;
  payload?: unknown;
  edgeStats?: EdgeStats;
  children: React.ReactNode;
}
```

Vanilla：

```ts
function wrapElement(
  element: HTMLElement,
  record: Omit<InsightRecord, "timestamp">
): () => void; // 返回卸载函数
```

### 3.4 Prompt 合并规则

```ts
function resolvePrompt(params: {
  preset: PromptPreset;
  override?: PromptOverride;
  userInput: string;
}): string;
```

规则：

1. `append`：`preset + override.text + userInput`
2. `replace`：`override.text + userInput`
3. 无 override：`preset + userInput`

## 4. Data Cleaner API（@insight-flow/data-cleaner）

### 4.1 插件类型

```ts
interface CleanerContext {
  identity?: Identity;
  semantics?: Semantics;
}

type CleanerPlugin = (
  input: unknown,
  ctx: CleanerContext
) => unknown | Promise<unknown>;
```

### 4.2 管线接口

```ts
interface CleanerPipeline {
  run(input: unknown, ctx?: CleanerContext): Promise<unknown>;
  use(plugin: CleanerPlugin): CleanerPipeline;
}

function createPipeline(plugins?: CleanerPlugin[]): CleanerPipeline;
```

### 4.3 Adapter Registry（异构数据适配）

```ts
interface AdapterRegistry {
  register(adapter: DataAdapter): void;
  unregister(adapterId: string): void;
  list(): DataAdapter[];
  adapt<TOutput = unknown>(input: unknown, options?: {
    adapterId?: string;
    includeRaw?: boolean;
  }): Promise<{
    adapterId: string;
    schema: DataSchemaDescriptor;
    data: TOutput;
    raw?: unknown;
  }>;
}

function createAdapterRegistry(initialAdapters?: DataAdapter[]): AdapterRegistry;
```

### 4.4 内置插件建议

- `normalize(options)`
- `sanitize(options)`
- `piiMask(options)`
- `dedupe(options)`

## 5. Compute Engine API（@insight-flow/compute-engine）

### 5.1 创建引擎

```ts
type ComputeMode = "js" | "worker" | "wasm" | "auto";

interface ComputeConfig {
  mode?: ComputeMode;
  thresholds?: {
    jsMaxPoints?: number;
    workerMaxPoints?: number;
  };
}

function createComputeEngine(config?: ComputeConfig): ComputeEngine;
```

### 5.2 统计接口

```ts
interface ComputeEngine {
  summarize(series: number[]): Promise<{
    mean: number;
    min: number;
    max: number;
    variance: number;
  }>;

  trend(series: number[]): Promise<{
    slope: number;
    intercept: number;
  }>;

  outliers(series: number[]): Promise<{
    indexes: number[];
    lowerFence: number;
    upperFence: number;
  }>;
}
```

## 6. Chat Connector API（@insight-flow/llm-connectors）

### 6.1 通用接口

```ts
interface ChatRequest {
  identityId: string;
  records: InsightRecord[];   // 当前选中模块上下文
  userInput: string;
  promptMode?: PromptMode;    // append / replace
  overridePrompt?: string;    // 用户输入提示词（可选）
}

interface ChatChunk {
  text: string;
  done?: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

interface InsightChatConnector {
  streamChat(req: ChatRequest): AsyncIterable<ChatChunk>;
}
```

请求校验建议：

1. `promptMode = "replace"` 时，`overridePrompt` 必填
2. `records` 至少包含一个当前选中模块
3. `identityId` 必须存在于 `records` 中

### 6.2 Dify 适配器

```ts
interface DifyConnectorConfig {
  baseUrl: string;
  apiKey: string;
  appId: string;
  timeoutMs?: number;
}

function createDifyConnector(config: DifyConnectorConfig): InsightChatConnector;
```

说明：

- 侧边栏 Chat 主路径默认使用 Dify 适配器
- `core` 只产出最终提示词与上下文，不直接调用 Dify SDK
- 支持流式输出（打字机效果）与用量回传

## 7. 事件与消息协议

推荐事件名（页面与插件统一）：

- `insight:item-registered`
- `insight:item-updated`
- `insight:item-unregistered`
- `insight:selection-changed`

消息体建议：

```ts
interface InsightEvent<T = unknown> {
  name: string;
  appId: string;
  version: string;
  timestamp: number;
  payload: T;
}
```

新增事件建议：

- `insight:prompt-override-changed`
- `insight:ai-reply-inserted`
- `insight:module-update-requested`
- `insight:chat-started`
- `insight:chat-finished`

## 8. 错误码建议

| Code | 含义 | 建议处理 |
|---|---|---|
| IF-CORE-001 | 重复 identity.id 注册 | 拒绝并告警 |
| IF-CORE-002 | record 不符合协议 | 校验失败并丢弃 |
| IF-PROMPT-001 | 模块缺少 promptPreset | 阻止注册并提示补全 |
| IF-PROMPT-002 | promptMode 非法 | 回退到 append |
| IF-ADAPTER-001 | 指定 adapter 不存在 | 终止适配并提示配置错误 |
| IF-ADAPTER-002 | 输入无法被任何 adapter 处理 | 拒绝注册并提示补充 schema |
| IF-CLEAN-001 | 清洗插件执行失败 | 跳过插件并记录日志 |
| IF-COMPUTE-001 | Worker 初始化失败 | 降级 JS 模式 |
| IF-COMPUTE-002 | WASM 加载失败 | 降级 Worker/JS |
| IF-CHAT-001 | Dify 鉴权失败 | 终止请求并提示重配 |
| IF-CHAT-002 | Dify 流式中断 | 自动重试或回退非流式 |

## 9. 版本与兼容策略

1. `protocol` 独立发布版本（如 `1.x`）。
2. `core` 主版本需声明支持的 `protocol` 范围（如 `^1.2.0`）。
3. 新增字段优先采用可选属性，避免破坏性升级。
4. 删除字段或语义变更仅在主版本进行。
