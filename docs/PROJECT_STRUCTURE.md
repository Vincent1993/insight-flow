# InsightFlow 项目结构设计（V2.0 POC：指纹缓存 + 联合 Chat）

> 目标：POC 阶段优先完成 **M1 单模块智能解读与指纹缓存**、**M2 多模块聚合叙事与生成式 Chat**，M3 暂列后续扩展。

## 1. 结构设计原则（按你的反馈调整）

1. **Core 中立**：核心只做“采集、协议、发现、分发、计算调度、提示词治理”，不硬编码任何厂商 SDK。
2. **任意组件可接入**：只要按 InsightSchema 注册，即可被侧边栏或 Chrome 插件发现。
3. **清洗能力独立**：数据清洗/脱敏/标准化拆分成独立功能包，按需组合。
4. **计算后端可切换**：默认 JS；大数据量可切 Worker；更高性能可切 WASM。
5. **协议优先**：`protocol` 独立版本演进，业务实现与协议解耦。
6. **模块级 Prompt 内建**：每个注册模块都可声明内置分析提示词，侧边栏支持“追加”或“替换”。
7. **指纹缓存优先**：M1 强制接入 `MD5 Fingerprint + IndexedDB`，数据未变不重复消耗 Token。

## 2. 推荐目录树（Core 不内嵌 Dify，Connector 对接）

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
│  │  │  ├─ prompt/
│  │  │  │  ├─ preset.ts                # 模块内置提示词模型
│  │  │  │  ├─ override.ts              # 用户追加/替换策略
│  │  │  │  └─ resolver.ts              # 最终提示词合并器
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
│  │  │  ├─ adapters/
│  │  │  │  └─ registry.ts              # Schema Adapter 注册与适配
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
│  ├─ fingerprint-cache/                 # 指纹识别与本地缓存（M1 核心）
│  │  ├─ src/
│  │  │  ├─ fingerprint/
│  │  │  │  ├─ stableSerialize.ts
│  │  │  │  └─ md5.ts
│  │  │  ├─ cache/
│  │  │  │  └─ interpretation.ts         # 指纹命中/失效/过期策略
│  │  │  └─ store/
│  │  │     ├─ memory.ts
│  │  │     └─ indexeddb.ts
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
│  ├─ llm-connectors/                    # AI 平台连接器（核心不耦合，Chat 默认接 Dify）
│  │  ├─ src/
│  │  │  ├─ dify/                        # 侧边栏 Chat 默认适配器
│  │  │  ├─ openai/                      # 可选替代
│  │  │  └─ custom-http/
│  │  └─ package.json
│  │
│  └─ shared/
│     ├─ src/
│     └─ package.json
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
│  ├─ adr/
│  ├─ INTEGRATION_GUIDE.md               # 接入说明
│  └─ API_DESIGN.md                      # API 设计
│
├─ .github/workflows/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ README.md
```

## 3. 核心能力拆分（按当前要求）

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

另外支持 `Schema Adapter`：

- 异构注入数据先通过 Adapter 适配成统一结构
- Adapter 会产出 `schema.id/version`，用于数据治理与审计追踪

### 3.3 大数据量计算策略（JS / Worker / WASM）

`packages/compute-engine` 提供统一 API，不暴露底层差异：

- **JS 引擎**：默认路径，小数据、低延迟启动
- **Worker 引擎**：中大数据，避免阻塞主线程
- **WASM 引擎**：超大数据或高频重复计算场景

建议调度策略（可配置）：

1. `< 5k` 数据点：JS
2. `5k - 100k`：Worker
3. `> 100k` 或复杂回归批量任务：WASM

### 3.4 选中模块即 Chat（Dify）+ Prompt 可治理

当模块被选中后，侧边栏启动会话并自动带入该模块上下文：

1. 模块注册时提供 `promptPreset`（内置分析提示词）
2. 用户在侧边栏输入附加意图时，可选择：
   - `append`：在内置提示词基础上追加
   - `replace`：完全替换内置提示词
3. `core/prompt/resolver` 生成最终提示词，再交由 `llm-connectors/dify` 调用 Dify 接口

这样既保留模块专家知识（内置 Prompt），又允许用户临时调整分析方向。

### 3.5 单模块指纹缓存（M1 核心链路）

1. 模块注册后先做边缘统计（均值/斜率/IQR）
2. 对 payload 生成 `MD5 Fingerprint`
3. 用户点击 AI 解读时先查本地缓存（IndexedDB）
   - 命中：直接回显历史结果（毫秒级）
   - 未命中或过期：调用 Dify 并回写缓存
   - 指纹不一致：提示“数据已更新，请重新解读”

## 4. 与里程碑映射（更新版）

### M1（基础底座）
- `packages/protocol`
- `packages/core`
- `packages/data-cleaner`
- `packages/compute-engine`（先落 JS 引擎）
- `packages/fingerprint-cache`（MD5 + IndexedDB）
- `packages/sidebar-ui`
- `apps/host-demo`

### M2（智能能力，Dify 为默认实现且可替换）
- `packages/llm-connectors/dify`（侧边栏 Chat 默认对接）
- `packages/sidebar-ui/chat`（Streaming）
- `packages/data-cleaner/plugins/pii-mask.ts`
- `packages/core/prompt/*`（提示词追加/替换与合并）

### M3（后续扩展，非 POC 主目标）
- `packages/markdown-block-mapper`
- `packages/feishu-client`
- `templates/feishu-card`
- 文档写入/回调/状态回放服务先不内建，按业务阶段外置实现

## 5. 关键边界建议（更新版）

1. `protocol` 是跨端契约源头，严格语义化版本管理。
2. `core` 只做发现/分发/调度，不内置任何 AI 平台 SDK。
3. `data-cleaner` 与 `compute-engine` 均可被 `core`、`sidebar-ui`、外部服务单独复用。
4. `llm-connectors` 是可插拔扩展层；当前 Chat 主路径使用 `dify` 适配器。
5. 飞书链路在当前阶段只保留 `packages/feishu-client` 与模板资产；服务端能力后续按需追加。
6. 每个模块必须支持 `promptPreset`，并允许会话级 `append/replace` 覆盖策略。

## 6. 第一阶段最小可运行切片（推荐）

先做 7 个模块即可稳定验证：

1. `packages/protocol`
2. `packages/core`
3. `packages/data-cleaner`
4. `packages/compute-engine`（JS + Worker）
5. `apps/host-demo` + `packages/sidebar-ui`
6. `packages/llm-connectors`（至少 `dify` 适配器）
7. `packages/fingerprint-cache`

完成后就能证明：

- 任意组件按协议注册可被发现
- 数据清洗可插拔
- 大数据量下可平滑切换 Worker，不阻塞主线程
- 数据未变时可命中缓存，避免重复 Token 消耗
- 选中任意模块后可在侧边栏发起 Dify Chat，且支持追加/替换模块内置 Prompt

## 7. 文档交付（当前版本）

1. `docs/PROJECT_STRUCTURE.md`：项目结构与里程碑映射
2. `docs/INTEGRATION_GUIDE.md`：宿主系统与插件接入说明
3. `docs/API_DESIGN.md`：核心 API、指纹缓存、Prompt 策略与 Dify Chat 接口设计
4. `docs/POC_V2_REFOCUS_PLAN.md`：V2 POC 阶段聚焦与验收清单
