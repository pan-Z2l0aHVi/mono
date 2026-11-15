# 依赖方案与变更

## 方案选择

根据任务比较现有能力、自实现与新增依赖，综合效果、维护成本、兼容性及供应链风险，选择最适合的方案。新增依赖是最优方案时，先确定具体依赖及其用途、影响与替代方案，按授权流程向用户提交交互式请求；获得授权后再安装和实施。授权未决期间继续不依赖该决定的工作，不为回避授权而选择效果较差的自实现。

## 变更授权

仅在用户明确授权新增、移除或变更依赖后，才可改动依赖。取得授权的机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。

## 放置规则

共享工具链、构建插件与测试基础设施放根 `devDependencies`；框架专属的测试与类型工具放所属包的 `devDependencies`；运行时依赖放所属包的 `dependencies`；消费者提供的依赖同时放 `peerDependencies` 与 `devDependencies`。

使用 `catalog:` 管理依赖版本。peer dependency 只在消费者兼容性需要时使用更宽的显式范围；可选 peer 设置 `peerDependenciesMeta.optional: true`。

跨发布流的依赖必须锁定到与已配置工具链验证过的同一已发布版本；例如桌面端 runtime 在 Go 与 npm 两侧的版本号不一定匹配。

新增会影响构建、lint 或发布产物的插件前，先核对它带入的传递依赖与产物边界。

## pnpm 策略

workspace 使用 `catalogMode: prefer`。除非用户明确授权变更依赖管理行为，否则保留现有的 `overrides`、`peerDependencyRules`、`allowBuilds` 与 `engineStrict`；授权机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)。

pnpm 只从 [`.npmrc`](../../.npmrc) 读取 auth 与 registry；依赖管理设置写在 [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) 或全局配置，应用级 [`.npmrc`](../../.npmrc) 不是有效入口。仓库当前没有发布年龄闸门；若需要，应写进 workspace 配置，并按本节开头的要求先取得变更授权。
