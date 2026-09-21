# 依赖变更

仅在用户明确授权新增、移除或变更依赖后，才可改动依赖；核对既有 catalog 归属与供应链设置可直接阅读本指南。

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

`@shadcn/lint` 由 catalog 提供版本（`^0.1.1`），只由根 `devDependencies` 引入、由 `vite.config.ts` 的 `lint.jsPlugins` 消费，`packages/*` 与 `apps/*` manifest 无一引用，因此不进任何发布产物。它换来的只是 `no-unknown-classes`、`no-inline-styles`、`require-static-classes` 三条规则，代价是把 eslint 与 `@typescript-eslint/parser` 拉进依赖图——全仓没有一个 manifest 直接声明它们，它们只因 `@shadcn/lint` 而存在（eslint 是它的 optional peer，parser 是它的直接依赖）。再引入同类 lint 插件前先核对这笔收支。

pnpm 12 只从 `.npmrc` 读 auth 与 registry，其余设置必须写在 `pnpm-workspace.yaml` 或 pnpm 的全局 `config.yaml`（`<pnpm config>` 目录：macOS `~/Library/Preferences/pnpm/`，Linux `~/.config/pnpm/`）。所以 `apps/interweave/frontend/.npmrc` 的 `minimum-release-age=10080` 不会被读到（该文件「honoured by pnpm」的注释在这一点上已过期），本仓也没有显式配置 `minimumReleaseAge`。

生效的是 pnpm 自己的默认值：v11 起 `minimumReleaseAge` 内置 1440 分钟（v11 之前为 0），对全部依赖含传递依赖生效。未显式配置时它是非严格的（`minimumReleaseAgeStrict` 只在显式配置 `minimumReleaseAge` 后才默认 true），所以找不到足够成熟的版本时 pnpm 回退安装而不是失败；registry 元数据缺 `time` 字段的包默认跳过检查（`minimumReleaseAgeIgnoreMissingTime: true`），npmmirror 的 packument 带 `time`，这条在本仓不会跳过。要收紧这道闸就把 `minimumReleaseAge` 写进根 `pnpm-workspace.yaml`，此时 strict 默认开启、变成硬失败。临时放行新发布的包用 `minimumReleaseAgeExclude`（v10.17.0 起支持 `@org/*`，v10.19.0 起支持 `pkg@x.y.z` 精确豁免）。这类条目没有到期机制：目标版本成熟之后它不再改变任何解析结果，但 pnpm 不会自动删掉它（只有 `minimumReleaseAgeExcludePrune: true` 且该版本已离开 lockfile 才会在 install/add/update 时清理，默认 false），所以日后抬高阈值时旧条目会重新生效、继续豁免那一个版本。豁免是临时的，用完就手动删。
