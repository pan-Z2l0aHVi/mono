# monorepo-kit

> 本仓库的门禁、策略检查与构建编排实现。

这是私有 workspace 包。源码是 TypeScript，`build` 跑 `vp pack` 产出 `dist/`（两个入口 `index.js` 与 `vite/index.js`，各带 `.d.ts`），消费方通过包名导入，不直接引用 `src/`。门禁读产物，因此依赖产物新鲜度，见 [AGENTS.md](./AGENTS.md)。

```js
import { defineCatch, defineRunner, getWorkspaceRoot } from '@greypan/monorepo-kit'
import { testPorts } from '@greypan/monorepo-kit/vite'
```

## 导出内容

`exports` 有两个 specifier，按消费者划分：`.` 给 Node 脚本（门禁入口与判定），`./vite` 给 `vite.config.ts` 在求值期用的 Vite 插件（`testPorts` 取端口段、`devHttpsPlugin` 挂 dev 证书）。入口导出三类：链协议（`defineRunner`、`defineCatch` 与 `Chain` / `Run` / `KitCtx` 类型）、插件（`defineXxx(options)`，判定插件产 `run`、能力插件产方法）、平铺的叶子函数与类型。每个能力目录自带 `index.ts` 作为这一分的对外面，`shared/` 没有——它的叶子由根入口直接指到文件。

判定不自己跑，也不带名字：触发层用 `.use()` 把配好参数的判定按想要的顺序接成一条链，`.make({ root, env })` 得到实例，`await kit.run()` 返回 `Result<void, string>`。`run` 不吃入参——判据参数（如 changeset 的 `base`/`head`）在 `defineXxx(options)` 里就给全了。执行顺序 = `.use()` 顺序，首个 `Err` 短路，失败归因只看 `Err` 文案的域名前缀，输出格式与退出码归触发层。协议与取舍见 [ADR-0022](../../docs/adr/0022-monorepo-kit-plugin-chain.md)。

| 分区          | 内容                                                                                                                                                                                                                   | 消费者                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/<能力>/` | 内聚竖切：一个能力一个目录，插件与它承载的参数化判定放在一起（`changesets`、`exec`、`git`、`test-ports`、`toolchain`、`turbo`、`workspace`）；判定是 `defineXxx(options)` → 一条 `Chain`，不含本仓库的名字、路径与数据 | 根 `scripts/policies/` 与外部脚本                      |
| `src/runner/` | 链协议本身：`defineRunner()` 是唯一基座（链头给恒等 `ok`，链中原样转发上一层的 `Err`，不改写也不吞域名前缀），`defineCatch()` 把逃逸的异常收成 `throw: ` 前缀的 `Err`；`Run` 与 `Chain` 只在这里声明                   | [`scripts/checks/`](../../scripts/checks) 与各应用测试 |
| `src/vite/`   | Vite 配置求值期的适配，不进 js-kit 的链：`testPorts`、`devHttpsPlugin` 两只 Vite 插件，以及端口表的读取与校验                                                                                                          | 各 workspace 的 `vite.config.ts`                       |
| `src/shared/` | 与仓库无关的纯工具：`config`、`errors`、`order`、`workspace-root`                                                                                                                                                      | 包内其他分区                                           |

分区判据与迁移理由见 [ADR-0018](../../docs/adr/0018-monorepo-kit-generic-plugins.md)，包内约束见 [AGENTS.md](./AGENTS.md)。

## 变更后验证

```bash
pnpm --filter @greypan/monorepo-kit build
pnpm --filter @greypan/monorepo-kit test
pnpm run check-pre-commit
pnpm run check-policy
```

门禁读取 `dist/` 产物，所以改完源码要先构建。根 `check-pre-commit` 会先构建本包。
