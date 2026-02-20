# InsightFlow 项目结构设计（Monorepo）

> 目标：支撑 `@insight-flow/sdk`、Chrome 插件、Dify 工作流与飞书闭环服务的并行演进，并与 M1/M2/M3 里程碑一一对应。

## 1. 结构设计原则

1. **协议先行**：Schema 与跨系统契约独立成包，避免实现与协议耦合。
2. **前后端解耦**：SDK（前端边缘计算）与协作后端（Dify/飞书）独立部署。
3. **能力复用**：统计引擎、消息总线、PII 脱敏等沉淀为 `packages/*` 公共模块。
4. **阶段可裁剪**：M1 可只启动 SDK + Sidebar，M2/M3 再逐步接入 AI 与飞书链路。

## 2. 推荐目录树

```text
insight-flow/
├─ apps/
│  ├─ host-demo/                      # 业务宿主示例（接入 InsightProvider/InsightItem）
│  │  ├─ src/
│  │  │  ├─ cards/                    # 模拟指标卡、趋势图卡
│  │  │  ├─ sidebar/                  # 侧边栏 UI（实时状态 + Chat）
│  │  │  ├─ store/                    # 宿主业务 Zustand store（示例）
│  │  │  └─ main.tsx
│  │  └─ package.json
│  ├─ extension-shell/                # Chrome 插件壳（三方页面外挂版）
│  │  ├─ src/
│  │  │  ├─ content/                  # 注入页面，采集卡片上下文
│  │  │  ├─ sidebar/                  # 插件侧边栏入口
│  │  │  └─ background/               # 消息中继、鉴权、配置同步
│  │  └─ package.json
│  └─ docs-site/                      # 文档站（可选）
│     └─ package.json
│
├─ packages/
│  ├─ sdk/                            # @insight-flow/sdk（核心包）
│  │  ├─ src/
│  │  │  ├─ provider/
│  │  │  │  └─ InsightProvider.tsx
│  │  │  ├─ components/
│  │  │  │  └─ InsightItem.tsx
│  │  │  ├─ schema/
│  │  │  │  └─ v1.ts                  # InsightSchema v1.0 类型定义
│  │  │  ├─ edge-stats/
│  │  │  │  ├─ metric.ts              # 均值、极值、方差、环比
│  │  │  │  ├─ trend.ts               # slope 斜率、线性回归
│  │  │  │  └─ outlier.ts             # IQR 离群识别
│  │  │  ├─ messenger/
│  │  │  │  └─ InsightMessenger.ts    # Native + postMessage 双模通信
│  │  │  ├─ store/
│  │  │  │  └─ insightStore.ts        # Zustand 状态总线
│  │  │  ├─ pii/
│  │  │  │  └─ masker.ts              # PII 脱敏
│  │  │  ├─ trace/
│  │  │  │  └─ stateTrace.ts          # StateTrace 快照
│  │  │  └─ index.ts
│  │  ├─ tests/
│  │  └─ package.json
│  │
│  ├─ protocol/                       # 协议与契约中心（跨端共享）
│  │  ├─ src/
│  │  │  ├─ insight-schema/
│  │  │  │  ├─ identity.ts
│  │  │  │  ├─ semantics.ts
│  │  │  │  ├─ edge-stats.ts
│  │  │  │  └─ state-trace.ts
│  │  │  ├─ dify/
│  │  │  │  └─ structured-output.ts   # Dify 结构化输出定义
│  │  │  └─ feishu/
│  │  │     ├─ block-schema.ts        # 飞书 Block 协议映射
│  │  │     └─ app-link.ts            # AppLink State Token 协议
│  │  └─ package.json
│  │
│  ├─ sidebar-ui/                     # 可复用侧边栏 UI（宿主与插件共用）
│  │  ├─ src/
│  │  │  ├─ panels/                   # 卡片摘要、AI 洞察、操作建议
│  │  │  ├─ chat/                     # Streaming 打字机效果
│  │  │  └─ hooks/
│  │  └─ package.json
│  │
│  ├─ markdown-block-mapper/          # Markdown -> Feishu Blocks 映射器
│  │  ├─ src/
│  │  │  ├─ parser/
│  │  │  ├─ transformers/
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ feishu-client/                  # 飞书 API SDK 封装（重试、限流、签名）
│  │  ├─ src/
│  │  │  ├─ docx/
│  │  │  ├─ card/
│  │  │  └─ auth/
│  │  └─ package.json
│  │
│  └─ shared/                         # 通用工具（logger、errors、types）
│     ├─ src/
│     └─ package.json
│
├─ services/
│  ├─ api-gateway/                    # BFF：统一鉴权、路由、租户隔离
│  │  ├─ src/
│  │  │  ├─ routes/
│  │  │  ├─ middleware/
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ dify-orchestrator/              # Dify 工作流调用与 Prompt 模板管理
│  │  ├─ src/
│  │  │  ├─ templates/                # Jinja2 模板变量定义
│  │  │  ├─ agents/                   # 归因 Agent 编排
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ feishu-docx-writer/             # 文档写入服务（异步批处理 + QPS 治理）
│  │  ├─ src/
│  │  │  ├─ queue/
│  │  │  ├─ writers/
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  ├─ callback-handler/               # 飞书卡片回调处理（幂等 + 回填）
│  │  ├─ src/
│  │  │  ├─ idempotency/              # event_id 去重/分布式锁
│  │  │  ├─ handlers/
│  │  │  └─ index.ts
│  │  └─ package.json
│  │
│  └─ state-replay/                   # AppLink 回跳状态还原服务
│     ├─ src/
│     │  ├─ token/
│     │  ├─ replay/
│     │  └─ index.ts
│     └─ package.json
│
├─ templates/
│  ├─ dify/                           # Dify 应用模板导出（DSL/JSON）
│  └─ feishu-card/                    # 飞书交互卡片模板
│
├─ configs/
│  ├─ eslint/
│  ├─ tsconfig/
│  ├─ vitest/
│  └─ commitlint/
│
├─ docs/
│  ├─ architecture/
│  │  ├─ 01-schema-driven.md
│  │  ├─ 02-edge-compute.md
│  │  └─ 03-feishu-loop.md
│  ├─ milestones/
│  │  ├─ M1.md
│  │  ├─ M2.md
│  │  └─ M3.md
│  └─ adr/                            # 架构决策记录
│
├─ .github/
│  └─ workflows/
│     ├─ ci.yml                       # lint + test + build
│     ├─ release-sdk.yml              # sdk 发包
│     └─ deploy-services.yml          # 服务部署
│
├─ package.json                       # workspace 根配置
├─ pnpm-workspace.yaml
├─ turbo.json                         # 任务编排（可选 Nx）
└─ README.md
```

## 3. 与里程碑的映射关系

### M1（基础底座）
- `packages/sdk`（Provider/Item、edge-stats、messenger、store）
- `packages/protocol`（InsightSchema v1.0）
- `apps/host-demo`（主界面 + 侧边栏实时同步）

### M2（智能引擎）
- `services/dify-orchestrator`（Jinja2 模板 + 归因 Agent）
- `packages/sidebar-ui`（Streaming Chat）
- `packages/sdk/src/pii`（脱敏网关）
- `templates/dify`（工作流模板）

### M3（行动协同）
- `packages/markdown-block-mapper`
- `services/feishu-docx-writer`
- `services/callback-handler`
- `services/state-replay`
- `templates/feishu-card`

## 4. 关键边界建议

1. `packages/protocol` **不依赖业务实现**，只维护类型与契约。
2. `packages/sdk` 只做前端能力，不直接耦合飞书 API。
3. `services/*` 统一通过 `api-gateway` 暴露外部接口，便于鉴权与审计。
4. `templates/*` 版本化管理，确保 Dify/飞书模板可回滚。

## 5. 最小可运行切片（建议先落地）

第一批只做以下 4 个模块即可跑通里程碑 1：

1. `packages/protocol`
2. `packages/sdk`
3. `packages/sidebar-ui`
4. `apps/host-demo`

这样可以在两周内先验证“零侵入接入 + 边缘统计 + 实时同步”，再增量接入 AI 与飞书能力。
