# InsightFlow API 设计（API Design）

> 本文档定义 InsightFlow 的核心接口契约，确保宿主应用、侧边栏、插件与扩展能力间可稳定协作。

## 1. 设计原则

1. 协议优先：所有输入输出都以 `@insight-flow/protocol` 为准。
2. 可插拔：清洗、计算、AI 连接器均可替换。
3. 分层解耦：Core 不依赖具体 AI 厂商与后端实现。
4. 向后兼容：协议按语义化版本迭代。

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

export interface InsightRecord {
  identity: Identity;
  semantics: Semantics;
  stateTrace: StateTrace;
  payload?: unknown;
  edgeStats?: EdgeStats;
  timestamp: number;
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
}
```

### 3.3 Wrapper API

React：

```ts
interface InsightItemProps {
  identity: Identity;
  semantics: Semantics;
  stateTrace?: StateTrace;
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

### 4.3 内置插件建议

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

## 6. 事件与消息协议

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

## 7. 错误码建议

| Code | 含义 | 建议处理 |
|---|---|---|
| IF-CORE-001 | 重复 identity.id 注册 | 拒绝并告警 |
| IF-CORE-002 | record 不符合协议 | 校验失败并丢弃 |
| IF-CLEAN-001 | 清洗插件执行失败 | 跳过插件并记录日志 |
| IF-COMPUTE-001 | Worker 初始化失败 | 降级 JS 模式 |
| IF-COMPUTE-002 | WASM 加载失败 | 降级 Worker/JS |

## 8. 版本与兼容策略

1. `protocol` 独立发布版本（如 `1.x`）。
2. `core` 主版本需声明支持的 `protocol` 范围（如 `^1.2.0`）。
3. 新增字段优先采用可选属性，避免破坏性升级。
4. 删除字段或语义变更仅在主版本进行。
