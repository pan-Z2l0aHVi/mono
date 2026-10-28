# monorepo-kit

本仓库的门禁、策略检查与构建编排实现。源码直出：`exports` 只有一个入口 `.` → `src/index.mjs`，没有构建步骤，`node` 与 `vite.config.ts` 直接消费源码。

```js
import { testApiPort, runEntrypoint, commandConventions } from '@greypan/monorepo-kit'
```

没有子路径。入口分两类导出，判据是「模块导出名是否互相冲突」：检查单元（`commandConventions`、`goCheck`…）导出 `name` 与 `run` 的模块以命名空间形式给出，其余叶子函数与常量平铺。运行时的 `src/index.mjs` 与声明的 `src/index.d.mts` 由 `src/index.test.mjs` 逐名比对。

| 分区      | 内容                                                                                 | 消费者                                                                                                   |
| --------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `shared/` | 仓库无关的工具：`config`、`exec`、`git`、`order`、`workspace-manifests`、`repo-root` | 本包其他分区；外部脚本按需取用                                                                           |
| `policy/` | 门禁原子实现与 `runEntrypoint`                                                       | [`scripts/checks/`](../../scripts/checks) 的薄入口                                                       |
| `repo/`   | 本仓库编排：`test-ports`（浏览器测试端口表）、`turbo-cache-dir`                      | 五个 `vite.config.ts`；`env-doctor` 用它，`scripts/lib/turbo-cache-dir.sh` 是它在 bootstrap 面的等价实现 |

分区判据与迁移理由见 [ADR-0030](../../docs/adr/0030-monorepo-tooling-package.md)，包内约束见 [AGENTS.md](./AGENTS.md)。

```bash
pnpm --filter @greypan/monorepo-kit test
```
