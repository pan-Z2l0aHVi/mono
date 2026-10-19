# 依赖变更

仅在用户明确授权新增、移除或变更依赖后，才可改动依赖；核对既有 catalog 归属与供应链设置可直接阅读本指南。取得授权的机制见 [`workflow.md`](workflow.md#怎么取得这个授权)。

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

## pnpm 策略

workspace 使用 `catalogMode: prefer`。除非用户明确授权变更依赖管理行为，否则保留现有的 `overrides` 与 `peerDependencyRules` 策略。这条与上面同一套授权机制，见 [`workflow.md`](workflow.md#怎么取得这个授权)。

`@shadcn/lint` 只由根 `devDependencies` 引入、由 `vite.config.ts` 的 `lint.jsPlugins` 消费，不进任何发布产物。它换来 `no-unknown-classes`、`no-inline-styles`、`require-static-classes` 三条规则，代价是把 eslint 与 `@typescript-eslint/parser` 拖进依赖图（前者是它的 optional peer，后者是直接依赖），而全仓没有 manifest 直接声明它们。再引入同类 lint 插件前先核对这笔收支。

pnpm 12 只从 `.npmrc` 读 auth 与 registry，其余设置要写在 `pnpm-workspace.yaml` 或全局 `config.yaml`，所以 `apps/interweave/frontend/.npmrc` 里的 `minimum-release-age` 不会被读到，本仓也没有显式配置 `minimumReleaseAge`。

未配置时生效的是 pnpm 默认值（v11 起内置 1440 分钟，含传递依赖），它是非严格的：找不到足够成熟的版本时回退安装而不是失败。要收紧这道闸，在根 `pnpm-workspace.yaml` 写 `minimumReleaseAge`，strict 随之默认开启、变成硬失败。临时放行新发布的包用 `minimumReleaseAgeExclude`，这类条目没有到期机制，抬高阈值后旧条目仍会继续豁免，用完要手动删。
