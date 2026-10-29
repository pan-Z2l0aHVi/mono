# monorepo-kit

本仓库的门禁、策略检查与构建编排实现。源码是 TypeScript，`build` 跑 `vp pack` 产出 `dist/index.js` 与 `dist/index.d.ts`；消费方一律经包名读产物，`dist/` 被 gitignore。门禁因此依赖产物新鲜度，见 [AGENTS.md](./AGENTS.md)。

```js
import { defineReadmeLocales, runEntrypoint } from '@greypan/monorepo-kit'
```

没有子路径，`exports` 只有 `.` 与 `./package.json`。入口分三类导出：能力插件（`defineExec`、`defineGit`…）、参数化检查（`defineReadmeLocales(options)` → `{ name, run }`）、以及平铺的叶子函数与类型。

| 分区       | 内容                                                                                   | 消费者                                             |
| ---------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `plugins/` | 能力插件：`exec`、`git`、`workspace`、`turbo`、`changesets`、`toolchain`、`test-ports` | 检查与外部脚本                                     |
| `checks/`  | 参数化判定：`defineXxx(options)` → `{ name, run }`，不含本仓库的名字、路径与数据       | 根 `scripts/policies/` 的实例                      |
| `runner/`  | `runChecks` / `runEntrypoint`：输出格式、首个失败的归因、非零退出                      | [`scripts/checks/`](../../scripts/checks) 的薄入口 |
| `shared/`  | 与仓库无关的纯工具：`config`、`errors`、`order`                                        | 包内其他分区                                       |

分区判据与迁移理由见 [ADR-0031](../../docs/adr/0031-monorepo-kit-generic-plugins.md)，包内约束见 [AGENTS.md](./AGENTS.md)。

```bash
pnpm --filter @greypan/monorepo-kit build   # 产出 dist/
pnpm --filter @greypan/monorepo-kit test    # 跑各分区 __tests__/ 下的 .spec.ts
```
