# monorepo-kit

本仓库门禁、策略检查与构建编排的实现包。源码是 TypeScript，`build` 跑 `vp pack` 产出 `dist/`（单入口 `index.js` 与 `index.d.ts`，外加按源码树对应的分块与 sourcemap），消费方一律经包名读产物，`dist/` 被 gitignore，不要手写，也不要从别的包引用 `src/`。门禁因此依赖产物新鲜度：根 `check-pre-commit` 先跑 `turbo run build --filter=@greypan/monorepo-kit`，CI 在门禁步骤之前显式构建；绕开这两条直接跑 `check-policy` 之类的命令会读到旧产物。

- **单一入口**：`exports` 只有 `.`。新增公共导出就改 `src/index.ts`，再跑 `pnpm --filter @greypan/monorepo-kit build`；只给包内用的模块不进入口。
- **包内引用用相对路径**：写成 `@greypan/monorepo-kit` 会绕回入口形成环。
- **导出形状看名字冲突**：检查单元（`name` + `run`，由 `check-runner` 消费）以命名空间导出，其余叶子函数与常量平铺。
- **模块顶层无副作用**：只做纯计算与常量校验；不读写文件、不起子进程、不查仓库根、不写 stdout/stderr。入口是整包再导出，任何顶层副作用都会在每个消费者身上执行一次。
- **分区按「换仓库是否重写」划分**：`shared/` 与仓库无关，`policy/` 是本仓库的门禁策略，`repo/` 是本仓库的构建与测试编排。往 `shared/` 放东西前先确认它不认识本仓库的路径、包名与语料。本仓库的编排数据放在根 `monorepo.json`（目前是端口分配），`repo/` 只放读取、校验与使用它的代码。
- **测试放模块旁的 `__tests__/`**，文件名是 `*.spec.ts`，由包自己的 `test`（`vp test run`）运行；`test-scripts` 已排除本包，不要在两处登记。测试 import 源码，`test` 不依赖 `build`，因此不需要先构建产物。
- **需要仓库根时用 `shared/repo-root.ts`**，不要按目录深度写 `../..`。
- 本包同时被 pre-commit、PR CI 与各 workspace 构建配置消费；改动后跑根 `check-pre-commit`、`check-policy` 与本包的 `build` + `test`。
