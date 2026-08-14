# 依赖变更

仅在用户明确授权新增、移除或变更依赖后，才可阅读本指南。

## 放置规则

| 依赖类型                        | 位置                                             |
| ------------------------------- | ------------------------------------------------ |
| 共享工具链和 Vite/Rolldown 插件 | 根目录 `devDependencies`                         |
| 框架专属的测试和类型工具        | 所属包的 `devDependencies`                       |
| 共享测试基础设施                | 根目录 `devDependencies`                         |
| 运行时依赖                      | 所属包的 `dependencies`                          |
| 消费者提供的依赖                | 所属包的 `peerDependencies` 和 `devDependencies` |

使用 `catalog:` 管理依赖版本。peer dependency 仅在消费者兼容性需要时才可使用更宽的显式范围；可选 peer 需设置 `peerDependenciesMeta.optional: true`。

`@wailsio/runtime` 必须锁定到与已配置 Wails CLI 和 Go 模块验证过的已发布版本。Wails alpha 版本号在 Go 和 npm 发布流中不一定匹配。

Changesets 对私有的 `@greypan/interweave` workspace 进行版本管理，使桌面端发布共享 monorepo 的版本审查流程。它必须保持私有，永远不会发布到 npm；`privatePackages.tag` 保持禁用状态，因为 Wails 工作流仅在两个原生构建成功后才创建其二进制发布标签。其嵌套的 `@greypan/interweave-frontend` WebView 包仍为 pnpm workspace 以支持本地依赖，但被 Changesets 忽略，因为它没有独立的发布生命周期。

Vite 类型系统插件应放在根目录 `devDependencies` 中，以避免 pnpm 解析出现分歧。框架绑定的工具应放在对应的框架包中。

## pnpm 策略

workspace 使用 `catalogMode: prefer`。除非用户明确授权变更依赖管理行为，否则保留现有的 `overrides` 和 `peerDependencyRules` 策略。
