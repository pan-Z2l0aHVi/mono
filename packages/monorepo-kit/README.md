# monorepo-kit

本仓库的门禁、策略检查与构建编排实现。源码直出：`exports` 全部指向 `src/**/*.mjs`，没有构建步骤，`node` 与 `vite.config.ts` 直接消费源码。

| 子路径          | 内容                                                                        | 消费者                                                                                                   |
| --------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `shared/<name>` | 仓库无关的工具：`config`、`exec`、`git`、`workspace-manifests`、`repo-root` | 本包其他分区                                                                                             |
| `policy/<name>` | 门禁原子实现与 `runEntrypoint`                                              | [`scripts/checks/`](../../scripts/checks) 的薄入口                                                       |
| `repo/<name>`   | 本仓库编排：`test-ports`（浏览器测试端口表）、`turbo-cache-dir`             | 六个 `vite.config.ts`；`env-doctor` 用它，`scripts/lib/turbo-cache-dir.sh` 是它在 bootstrap 面的等价实现 |

分区判据与迁移理由见 [ADR-0030](../../docs/adr/0030-monorepo-tooling-package.md)，包内约束见 [AGENTS.md](./AGENTS.md)。

```bash
pnpm --filter @greypan/monorepo-kit test
```
