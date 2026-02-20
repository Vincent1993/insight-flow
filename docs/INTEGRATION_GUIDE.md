# InsightFlow 接入说明（Integration Guide）

> 本文档说明如何将 InsightFlow 接入任意业务前端，并被主应用侧边栏或 Chrome 插件侧边栏自动发现。

## 1. 接入目标

接入完成后，你将获得以下能力：

1. 任意组件按协议注册后可被统一发现
2. 主界面与侧边栏状态实时同步
3. 数据在进入分析链路前可执行可插拔清洗
4. 计算可按数据规模自动切换 JS / Worker / WASM

## 2. 包与职责

必选包：

- `@insight-flow/protocol`：协议类型定义（Identity / Semantics / StateTrace / EdgeStats）
- `@insight-flow/core`：注册、发现、消息总线、调度
- `@insight-flow/data-cleaner`：数据清洗管线
- `@insight-flow/compute-engine`：统计计算引擎

可选包：

- `@insight-flow/sidebar-ui`：侧边栏 UI 组件
- `@insight-flow/llm-connectors`：外部 AI 连接器适配
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

## 4. 非 React 接入（Vanilla）

```ts
import { wrapElement } from "@insight-flow/core/wrappers/vanilla";

const el = document.getElementById("trend-chart");

wrapElement(el, {
  identity: { type: "trend-chart", id: "trend-orders" },
  semantics: { metric: "order_count", domain: "ops" },
  stateTrace: { filters: ["shop_id=1001"] },
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

## 7. 接入验收清单

- [ ] 组件可被注册并在注册中心可见
- [ ] 主界面选中状态能同步到侧边栏
- [ ] 清洗前后数据差异可观测（日志或 debug 面板）
- [ ] 大数据集计算不会阻塞主线程
- [ ] 脱敏字段在分析链路中不可逆明文外泄

## 8. 常见问题

1. 侧边栏看不到组件？
   - 检查是否填写 `identity.id`
   - 检查 discovery 广播是否启用

2. 页面卡顿？
   - 降低主线程计算阈值，提前切换 Worker

3. 字段口径不一致？
   - 在 `normalize` 插件统一字段映射规则
