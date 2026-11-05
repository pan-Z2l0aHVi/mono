# monorepo-kit

> 本仓库的检查、策略辅助与构建编排实现。

这是私有 workspace 包。源码是 TypeScript，构建产物在 `dist/`，消费方通过包名导入，不直接引用 `src/`。

```js
import { defineReadmeLocales, runEntrypoint } from '@greypan/monorepo-kit'
```

## 导出内容

入口只有 `@greypan/monorepo-kit`，没有子路径。导出分三类：

| 分类         | 内容                                                                                 | 使用方                                    |
| ------------ | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| 能力插件     | `defineExec`、`defineGit`、`defineWorkspace`、`defineTurbo`、`defineChangesets` 等。 | 外部脚本与 `scripts/policies/` 中的实例。 |
| 参数化检查   | `defineXxx(options)` 返回 `{ name, run }`，由检查运行器执行。                        | `scripts/checks/` 与策略文件。            |
| 运行器与工具 | `runChecks`、`runEntrypoint`，以及配置、错误和排序工具。                             | 包内与仓库脚本。                          |

能力插件只包含通用逻辑，不写死本仓库的名字、路径或数据。仓库策略实例放在 `scripts/policies/`，通过参数传给这些检查。

## 变更后验证

```bash
pnpm --filter @greypan/monorepo-kit build
pnpm --filter @greypan/monorepo-kit test
pnpm run check-pre-commit
pnpm run check-policy
```

门禁读取 `dist/` 产物，所以改完源码要先构建。根 `check-pre-commit` 会先构建本包。
