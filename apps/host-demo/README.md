# Host Demo

该示例展示以下闭环：

1. 模块注册并被 `core` 发现
2. 侧边栏 Chat 结束后，将 `sessionId + AI 回复` 回写到页面模块
3. 页面点击“更新”后触发数据刷新与统计量重算

核心入口：`src/index.ts`

- `HostDemoRuntime.registerModule`：注册与发现
- `HostDemoRuntime.chatOnSelectedModule`：会话并回写
- `HostDemoRuntime.clickUpdate`：点击更新并重算
