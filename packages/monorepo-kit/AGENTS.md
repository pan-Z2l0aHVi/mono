# monorepo-kit

本仓库门禁、策略检查与构建编排的实现包。源码是 TypeScript，`build` 跑 `vp pack` 产出 `dist/`（单入口 `index.js` 与 `index.d.ts`，外加按源码树对应的分块与 sourcemap），消费方一律经包名读产物，`dist/` 被 gitignore，不要手写，也不要从别的包引用 `src/`。门禁因此依赖产物新鲜度：根 `check-pre-commit` 先跑 `turbo run build --filter=@greypan/monorepo-kit`，CI 在门禁步骤之前显式构建；绕开这两条直接跑 `check-policy` 之类的命令会读到旧产物。

- **单一入口**：`exports` 只有 `.`。新增公共导出就改 `src/index.ts`，再跑 `pnpm --filter @greypan/monorepo-kit build`；只给包内用的模块不进入口。
- **包内引用用相对路径**：写成 `@greypan/monorepo-kit` 会绕回入口形成环。
- **插件 API 的键不得与 context 同名**（`root`、`env`）：`definePlugin` 的 `use` 合并时 API 覆盖 context 且不报错，下游拿到的是 `root()` 函数而不是仓库根字符串。
- **导出形状看名字冲突**：检查单元（`name` + `run`，由 `check-runner` 消费）以命名空间导出，其余叶子函数与常量平铺。
- **模块顶层无副作用**：只做纯计算与常量校验；不读写文件、不起子进程、不查仓库根、不写 stdout/stderr。入口是整包再导出，任何顶层副作用都会在每个消费者身上执行一次。
- **分区判据是「这段代码是否知道本仓库的名字、路径或数据」**：包只有 `plugin/`、`runner/`、`shared/` 三个分区。`plugin/<能力>/` 是内聚竖切——一个能力一个目录，能力插件与它承载的参数化判定（`defineXxx(options)` → `{ name, run }`）住在一起；一份判定归谁，看它的权威输入由哪个能力拥有，不看它 import 了几个能力。`runner/` 是执行与输出，`shared/` 是与仓库无关的纯工具；本仓库的策略实例住在根 `scripts/policies/`，由组合点传参（见 ADR-0018）。本仓库的编排数据放在根 `monorepo.json`（目前是端口分配）。
- **测试放所属能力目录的 `__tests__/`**，文件名是 `*.spec.ts`，由包自己的 `test`（`vp test run`）运行；`test-scripts` 只跑全仓 `*.test.mjs`，不要在两处登记。测试 import 源码，`test` 不依赖 `build`，因此不需要先构建产物。
- **需要仓库根时用 `plugin/workspace/workspace.ts` 的 `findRepoRoot`**，不要按目录深度写 `../..`。
- 本包同时被 pre-commit、PR CI 与各 workspace 构建配置消费；改动后跑根 `check-pre-commit`、`check-policy` 与本包的 `build` + `test`。
