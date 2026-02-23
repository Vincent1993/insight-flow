# InsightFlow 接入说明（Integration Guide）

> 本文档说明如何将 InsightFlow 接入任意业务前端，并被主应用侧边栏或 Chrome 插件侧边栏自动发现。

## 1. 接入目标

接入完成后，你将获得以下能力：

1. 任意组件按协议注册后可被统一发现
2. 主界面与侧边栏状态实时同步
3. 数据在进入分析链路前可执行可插拔清洗
4. 计算可按数据规模自动切换 JS / Worker / WASM
5. 选中模块后可在侧边栏发起 Dify Chat
6. 每个模块支持内置提示词，并允许用户追加或替换
7. 异构注入数据可通过 Schema Adapter 自动适配
8. 基于 MD5 指纹命中缓存，数据未变不重复调用 AI

## 2. 包与职责

必选包：

- `@insight-flow/protocol`：协议类型定义（Identity / Semantics / StateTrace / EdgeStats）
- `@insight-flow/core`：注册、发现、消息总线、调度
- `@insight-flow/data-cleaner`：数据清洗管线
- `@insight-flow/compute-engine`：统计计算引擎
- `@insight-flow/llm-connectors`：Dify Chat 连接器（选中模块即会话）
- `@insight-flow/fingerprint-cache`：MD5 指纹 + 本地缓存（IndexedDB/Memory）

可选包：

- `@insight-flow/sidebar-ui`：侧边栏 UI 组件
- `@insight-flow/feishu-client`：飞书能力封装

## 3. 快速接入（React）

### 步骤 1：初始化 Core Runtime

```ts
import { createInsightCore } from "@insight-flow/core";

export const insightCore = createInsightCore({
  appId: "sales-dashboard",
  channel: "native",
  discovery: { enableBroadcast: true },
});
```

### 步骤 2：配置数据清洗管线

```ts
import { createPipeline } from "@insight-flow/data-cleaner";
import { normalize, sanitize, piiMask } from "@insight-flow/data-cleaner/plugins";

export const cleaner = createPipeline([
  normalize(),
  sanitize(),
  piiMask({ fields: ["user_id", "phone"] }),
]);
```

### 步骤 3：配置计算引擎（含自动调度）

```ts
import { createComputeEngine } from "@insight-flow/compute-engine";

export const engine = createComputeEngine({
  mode: "auto",
  thresholds: {
    jsMaxPoints: 5000,
    workerMaxPoints: 100000,
  },
});
```

### 步骤 4：包裹业务组件并注册协议数据

```tsx
import { InsightItem } from "@insight-flow/core/wrappers/react";

export function RevenueCard({ data }) {
  return (
    <InsightItem
      identity={{ type: "metric-card", id: "revenue-card" }}
      semantics={{ metric: "revenue", domain: "sales" }}
      stateTrace={{ filters: ["region=APAC"], granularity: "day" }}
      promptPreset={{
        system: "你是资深经营分析师，请先基于确定性统计结论再给判断。",
        task: "分析收入波动的核心驱动，给出可执行建议。",
        output: "按 1) 结论 2) 证据 3) 建议 格式输出",
        defaultMode: "append",
      }}
      payload={data}
    >
      <YourCard data={data} />
    </InsightItem>
  );
}
```

### 步骤 5：在侧边栏订阅已发现组件

```ts
const unsubscribe = insightCore.subscribeSelection((selected) => {
  // selected 为当前选中组件的协议化数据
  // 可用于渲染统计摘要、对话上下文等
});
```

### 步骤 5.1：通过 Adapter 适配异构注入数据（推荐）

```ts
import { createAdapterRegistry } from "@insight-flow/data-cleaner/adapters";

const adapters = createAdapterRegistry([metricSeriesAdapter, trendRowsAdapter]);

const adapted = await adapters.adapt(rawInput);
// adapted.schema.id / adapted.schema.version 可写入 stateTrace.ext 做治理追踪
```

### 步骤 6：配置 Dify Chat 连接器

```ts
import { createDifyConnector } from "@insight-flow/llm-connectors/dify";

export const difyChat = createDifyConnector({
  baseUrl: "https://api.dify.ai/v1",
  apiKey: process.env.DIFY_API_KEY!,
  appId: "insight-chat-app-id",
});
```

### 步骤 7：配置指纹缓存（M1 核心）

```ts
import {
  createIndexedDbKvStore,
  createInterpretationCache,
  createMd5Fingerprint
} from "@insight-flow/fingerprint-cache";

const cache = createInterpretationCache(
  createIndexedDbKvStore({ dbName: "insight-flow", storeName: "interpretation" }),
  { ttlMs: 30 * 60 * 1000 }
);

const fingerprint = createMd5Fingerprint(payload);
const status = await cache.getStatus(identityId, fingerprint);
```

### 步骤 8：发起会话（支持 append / replace）

```ts
const result = await difyChat.streamChat({
  identityId: "revenue-card",
  records: selectedRecords,
  userInput: "重点解释华东区本周波动",
  promptMode: "append", // 或 "replace"
  // 当 promptMode = "replace" 时建议传 overridePrompt
  // overridePrompt: "你只需输出异常归因，不要给运营建议",
});
```

提示词合并规则：

- `append`：`内置提示词 + 用户新增提示词 + 当前会话问题`
- `replace`：`用户替换提示词 + 当前会话问题`（不使用内置提示词）

会话回写建议：

```ts
core.insertAiReply(identityId, {
  sessionId: result.sessionId,
  reply: result.reply
});
```

页面点击更新建议：

```ts
await core.requestModuleUpdate(identityId, nextPayload);
```

缓存命中策略建议：

- `hit`：直接使用缓存回复并回写页面
- `stale`：提示“数据已更新，请点击重新解读”
- `miss`：正常调用 Dify，完成后写入缓存

## 4. 非 React 接入（Vanilla）

```ts
import { wrapElement } from "@insight-flow/core/wrappers/vanilla";

const el = document.getElementById("trend-chart");

wrapElement(el, {
  identity: { type: "trend-chart", id: "trend-orders" },
  semantics: { metric: "order_count", domain: "ops" },
  stateTrace: { filters: ["shop_id=1001"] },
  promptPreset: {
    system: "你是运营分析顾问，基于趋势变化给出解释。",
    task: "识别订单趋势转折点并给出原因假设。",
    defaultMode: "append",
  },
  payload: chartData,
});
```

## 5. Chrome 插件侧边栏发现模式

1. Content Script 注入页面并监听注册广播
2. 将协议化载荷转发给插件侧边栏
3. 插件侧边栏复用 `@insight-flow/sidebar-ui` 展示内容

建议：

- 页面内通信：`postMessage`
- 插件内通信：`chrome.runtime.sendMessage`
- 统一事件名：`insight:item-registered` / `insight:selection-changed`

## 6. 清洗与计算推荐配置

### 6.1 清洗策略

- 轻模式：`normalize + sanitize`
- 标准模式：`normalize + sanitize + piiMask`
- 强治理模式：`normalize + sanitize + piiMask + dedupe`

### 6.2 计算策略

- `< 5k` 点：JS
- `5k - 100k` 点：Worker
- `> 100k` 点或高频批量任务：WASM

### 6.3 Prompt 策略

- 建议每个模块都配置业务专属 `promptPreset`
- 默认模式建议 `append`，防止用户输入过短导致分析失焦
- 高级用户可切换到 `replace` 完全接管提示词
- 侧边栏 UI 要明显展示当前模式（Append / Replace）

## 7. 接入验收清单

- [ ] 组件可被注册并在注册中心可见
- [ ] 主界面选中状态能同步到侧边栏
- [ ] 清洗前后数据差异可观测（日志或 debug 面板）
- [ ] 大数据集计算不会阻塞主线程
- [ ] 脱敏字段在分析链路中不可逆明文外泄
- [ ] 选中模块后能直接在侧边栏与 Dify 对话
- [ ] 用户可切换提示词模式（append/replace）且结果符合预期
- [ ] 异构数据至少有一个 Adapter 可成功适配并注册
- [ ] 会话 sessionId 与 AI 回复可回写到页面模块
- [ ] 点击“更新”后模块数据与统计量能刷新
- [ ] 同一数据指纹下重复提问可命中本地缓存

## 8. 常见问题

1. 侧边栏看不到组件？
   - 检查是否填写 `identity.id`
   - 检查 discovery 广播是否启用

2. 页面卡顿？
   - 降低主线程计算阈值，提前切换 Worker

3. 字段口径不一致？
   - 在 `normalize` 插件统一字段映射规则

4. Chat 回答不贴合业务？
   - 检查该模块 `promptPreset` 是否完整（system/task/output）
   - 优先使用 `append` 模式保留业务内置提示词
