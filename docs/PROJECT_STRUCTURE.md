# InsightFlow 项目结构设计（协议驱动 + 可插拔计算版）

> 目标：构建一个不绑定具体 AI 平台（可不内嵌 Dify）、可发现任意业务组件、可按数据规模切换 JS/Worker/WASM 的工业级分析底座。

## 1. 结构设计原则（按你的反馈调整）

1. **Core 中立**：核心只做“采集、协议、发现、分发、计算调度”，不内置 Dify。
2. **任意组件可接入**：只要按 InsightSchema 注册，即可被侧边栏或 Chrome 插件发现。
3. **清洗能力独立**：数据清洗/脱敏/标准化拆分成独立功能包，按需组合。
4. **计算后端可切换**：默认 JS；大数据量可切 Worker；更高性能可切 WASM。
5. **协议优先**：`protocol` 独立版本演进，业务实现与协议解耦。

## 2. 推荐目录树（去 Dify 内嵌）

```text
insight-flow/
├─ apps/
│  ├─ host-demo/                         # 宿主系统示例（演示任意组件接入）
│  │  ├─ src/
│  │  │  ├─ cards/
│  │  │  ├─ sidebar/
│  │  │  └─ main.tsx
│  │  └─ package.json
│  ├─ extension-shell/                   # Chrome 插件壳（外挂侧边栏）
│  │  ├─ src/
│  │  │  ├─ content/
│  │  │  ├─ sidebar/
│  │  │  └─ background/
│  │  └─ package.json
│  └─ docs-site/                         # 可选文档站
│     └─ package.json
│
├─ packages/
│  ├─ protocol/                          # 协议中心（唯一真相）
│  │  ├─ src/
│  │  │  ├─ insight-schema/
│  │  │  │  ├─ identity.ts
│  │  │  │  ├─ semantics.ts
│  │  │  │  ├─ edge-stats.ts
│  │  │  │  └─ state-trace.ts
│  │  │  └─ feishu/
│  │  │     ├─ block-schema.ts
│  │  │     └─ app-link.ts
│  │  └─ package.json
│  │
│  ├─ core/                              # @insight-flow/core（中立内核）
│  │  ├─ src/
│  │  │  ├─ runtime/
│  │  │  │  ├─ registry.ts              # 组件注册中心（协议化登记）
│  │  │  │  ├─ discovery.ts             # 发现机制（本地/跨窗口）
│  │  │  │  ├─ state-bus.ts             # Zustand/PubSub 状态总线
│  │  │  │  ├─ messenger.ts             # native + postMessage
│  │  │  │  └─ scheduler.ts             # 计算后端调度器
│  │  │  ├─ wrappers/
│  │  │  │  ├─ react/
│  │  │  │  │  └─ InsightItem.tsx       # React 包裹器
│  │  │  │  └─ vanilla/
│  │  │  │     └─ wrapElement.ts        # 非 React 组件包裹器
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ data-cleaner/                      # 独立数据清洗功能包
│  │  ├─ src/
│  │  │  ├─ pipeline/
│  │  │  │  └─ createPipeline.ts        # 清洗管线编排
│  │  │  ├─ plugins/
│  │  │  │  ├─ normalize.ts             # 字段标准化
│  │  │  │  ├─ sanitize.ts              # 非法值治理
│  │  │  │  ├─ pii-mask.ts              # 脱敏
│  │  │  │  └─ dedupe.ts                # 去重
│  │  │  ├─ validators/
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ compute-engine/                    # 独立计算引擎（可替换后端）
│  │  ├─ src/
│  │  │  ├─ api/
│  │  │  │  └─ types.ts                 # 统一统计接口
│  │  │  ├─ engines/
│  │  │  │  ├─ js/                      # 默认纯 JS 引擎
│  │  │  │  ├─ worker/                  # Web Worker 引擎
│  │  │  │  └─ wasm/                    # WASM 引擎（高阶）
│  │  │  ├─ stats/
│  │  │  │  ├─ metric.ts                # 均值/极值/方差/环比
│  │  │  │  ├─ trend.ts                 # slope/线性回归
│  │  │  │  └─ outlier.ts               # IQR
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ sidebar-ui/                        # 可复用侧边栏（宿主与插件共用）
│  │  ├─ src/
│  │  │  ├─ panels/
│  │  │  ├─ chat/
│  │  │  └─ hooks/
│  │  └─ package.json
│  │
│  ├─ markdown-block-mapper/             # Markdown -> Feishu Blocks
│  │  ├─ src/
│  │  └─ package.json
│  │
│  ├─ feishu-client/                     # 飞书 API 封装（重试、限流、签名）
│  │  ├─ src/
│  │  └─ package.json
│  │
│  ├─ llm-connectors/                    # 可选：AI 平台连接器（非核心内嵌）
│  │  ├─ src/
│  │  │  ├─ dify/                        # 可选适配器
│  │  │  ├─ openai/
│  │  │  └─ custom-http/
│  │  └─ package.json
│  │
│  └─ shared/
│     ├─ src/
│     └─ package.json
│
├─ services/
│  ├─ api-gateway/                       # BFF：鉴权、租户、审计
│  ├─ feishu-docx-writer/                # Docx 写入（异步批处理 + 限流）
│  ├─ callback-handler/                  # 卡片回调幂等 + 回填
│  └─ state-replay/                      # AppLink 状态还原
│
├─ templates/
│  └─ feishu-card/
│
├─ configs/
│  ├─ eslint/
│  ├─ tsconfig/
│  ├─ vitest/
│  └─ commitlint/
│
├─ docs/
│  ├─ architecture/
│  ├─ milestones/
│  └─ adr/
│
├─ .github/workflows/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ README.md
```

## 3. 核心能力拆分（你提出的三点）

### 3.1 任意组件可包裹 + 自动发现

核心是 `packages/core` 的注册机制：

- React 场景：`wrappers/react/InsightItem.tsx`
- 非 React 场景：`wrappers/vanilla/wrapElement.ts`

只要组件注册时提供：

- `Identity`（组件身份）
- `Semantics`（语义标签）
- `StateTrace`（状态快照）
- `EdgeStats`（可选预计算）

侧边栏与插件即可统一发现并订阅。

### 3.2 数据清洗独立包（更灵活）

`packages/data-cleaner` 不绑定核心逻辑，按管线插拔：

1. normalize（标准化）
2. sanitize（脏数据治理）
3. pii-mask（脱敏）
4. dedupe（去重）

可按业务场景自定义顺序或关闭某些步骤，满足“轻/重模式”。

### 3.3 大数据量计算策略（JS / Worker / WASM）

`packages/compute-engine` 提供统一 API，不暴露底层差异：

- **JS 引擎**：默认路径，小数据、低延迟启动
- **Worker 引擎**：中大数据，避免阻塞主线程
- **WASM 引擎**：超大数据或高频重复计算场景

建议调度策略（可配置）：

1. `< 5k` 数据点：JS
2. `5k - 100k`：Worker
3. `> 100k` 或复杂回归批量任务：WASM

## 4. 与里程碑映射（更新版）

### M1（基础底座）
- `packages/protocol`
- `packages/core`
- `packages/data-cleaner`
- `packages/compute-engine`（先落 JS 引擎）
- `packages/sidebar-ui`
- `apps/host-demo`

### M2（智能能力，但不绑定 Dify）
- `packages/llm-connectors`（可选接入 Dify/OpenAI/自研）
- `packages/sidebar-ui/chat`（Streaming）
- `packages/data-cleaner/plugins/pii-mask.ts`

### M3（飞书闭环）
- `packages/markdown-block-mapper`
- `packages/feishu-client`
- `services/feishu-docx-writer`
- `services/callback-handler`
- `services/state-replay`

## 5. 关键边界建议（更新版）

1. `protocol` 是跨端契约源头，严格语义化版本管理。
2. `core` 只做发现/分发/调度，不内置任何 AI 平台 SDK。
3. `data-cleaner` 与 `compute-engine` 均可被 `core`、`sidebar-ui`、后端服务单独复用。
4. `llm-connectors` 是可插拔扩展层，可引入 Dify，但不是主干依赖。
5. 飞书链路保持在 `packages/feishu-client + services/*`，避免污染前端核心包。

## 6. 第一阶段最小可运行切片（推荐）

先做 5 个模块即可稳定验证：

1. `packages/protocol`
2. `packages/core`
3. `packages/data-cleaner`
4. `packages/compute-engine`（JS + Worker）
5. `apps/host-demo` + `packages/sidebar-ui`

完成后就能证明：

- 任意组件按协议注册可被发现
- 数据清洗可插拔
- 大数据量下可平滑切换 Worker，不阻塞主线程
