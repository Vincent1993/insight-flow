# Host Demo

技术栈：React + Rsbuild（Rsstack）

该示例展示以下闭环：

1. 模块注册并被 `core` 发现
2. 侧边栏 Chat 结束后，将 `sessionId + AI 回复` 回写到页面模块
3. 页面点击“更新”后触发数据刷新与统计量重算
4. 异构注入数据通过 Adapter + Schema 自动适配为统一结构
5. 基于 MD5 数据指纹命中本地缓存（hit/miss/stale）

核心入口：`src/index.ts`

- `HostDemoRuntime.registerModule`：注册与发现
- `HostDemoRuntime.registerInjectedModule`：适配器注入注册
- `HostDemoRuntime.chatOnSelectedModule`：会话并回写
- `HostDemoRuntime.clickUpdate`：点击更新并重算
- `HostDemoRuntime.checkInterpretationStatus`：查询缓存命中状态

React 展示层：

- `src/App.tsx`：模块列表 + 侧边栏 Chat + 缓存状态展示
- `src/main.tsx`：React 挂载入口
- `rsbuild.config.ts`：Rsbuild 构建配置（React 插件）

运行：

- `pnpm --filter @insight-flow/host-demo dev`
