# 依赖变更

仅在用户明确授权新增、移除或变更依赖后，才可改动依赖。取得授权的机制见 [`workflow.md`](workflow.md#怎么取得这个授权)。

## 放置规则

共享工具链、构建插件与测试基础设施放根 `devDependencies`；框架专属的测试与类型工具放所属包的 `devDependencies`；运行时依赖放所属包的 `dependencies`；消费者提供的依赖同时放 `peerDependencies` 与 `devDependencies`。

使用 `catalog:` 管理依赖版本。peer dependency 只在消费者兼容性需要时使用更宽的显式范围；可选 peer 设置 `peerDependenciesMeta.optional: true`。

跨发布流的依赖必须锁定到与已配置工具链验证过的同一已发布版本；例如桌面端 runtime 在 Go 与 npm 两侧的版本号不一定匹配。

新增会影响构建、lint 或发布产物的插件前，先核对它带入的传递依赖与产物边界。

## pnpm 策略

workspace 使用 `catalogMode: prefer`。除非用户明确授权变更依赖管理行为，否则保留现有的 `overrides` 与 `peerDependencyRules`；授权机制见 [`workflow.md`](workflow.md#怎么取得这个授权)。

pnpm 只从 `.npmrc` 读取 auth 与 registry；依赖管理设置写在 `pnpm-workspace.yaml` 或全局配置，应用级 `.npmrc` 不是有效入口。仓库当前没有发布年龄闸门；若需要，应写进 workspace 配置，并按本节开头的要求先取得变更授权。
