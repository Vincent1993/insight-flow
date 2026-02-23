# Rsstack 全家桶工程化说明（最新版）

> 当前仓库已切换为 Rsstack 工具链：Rsbuild + Rslib + Rstest + Rspress V2 + OXlint。

## 1. 工具选型

- 构建应用：`@rsbuild/core` + `@rsbuild/plugin-react`
- 构建库包：`@rslib/core`
- 单元测试：`@rstest/core`
- 文档站：`@rspress/core`（V2）
- Lint/格式化：`oxlint`

## 2. Workspace 布局

- `apps/host-demo`：React Demo（Rsbuild）
- `apps/docs-site`：文档站（Rspress V2）
- `packages/*`：SDK 能力包（Rslib）

## 3. 常用命令

```bash
# 启动 React Demo
pnpm --filter @insight-flow/host-demo dev

# 启动文档站（Rspress V2）
pnpm --filter @insight-flow/docs-site dev

# 全量构建（apps + packages）
pnpm build

# 类型检查
pnpm typecheck

# 测试
pnpm test

# Lint
pnpm lint

# 自动修复
pnpm lint:fix
```

## 4. 关键配置文件

- `apps/host-demo/rsbuild.config.ts`
- `apps/docs-site/rspress.config.ts`
- `packages/*/rslib.config.ts`
- `rstest.config.ts`
- `.oxlintrc.json`
