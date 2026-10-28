# monorepo-kit

本仓库门禁、策略检查与构建编排的实现包。运行时源码直出，消费方直接读 `src/`；`build` 只把类型声明生成到 `dist/`，声明不要手写。加运行时构建会让门禁跑在上一次产物上，这是本包不能接受的失效。

- **单一入口**：`exports` 只有 `.`。新增公共导出就改 `src/index.mjs`，再跑 `pnpm --filter @greypan/monorepo-kit build`；只给包内用的模块不进入口。
- **包内引用用相对路径**：写成 `@greypan/monorepo-kit` 会绕回入口形成环。
- **导出形状看名字冲突**：检查单元（`name` + `run`，由 `check-runner` 消费）以命名空间导出，其余叶子函数与常量平铺。
- **模块顶层无副作用**：只做纯计算与常量校验；不读写文件、不起子进程、不查仓库根、不写 stdout/stderr。入口是整包再导出，任何顶层副作用都会在每个消费者身上执行一次。
- **分区按「换仓库是否重写」划分**：`shared/` 与仓库无关，`policy/` 是本仓库的门禁策略，`repo/` 是本仓库的构建与测试编排。往 `shared/` 放东西前先确认它不认识本仓库的路径、包名与语料。本仓库的编排数据放在根 `monorepo.json`（目前是端口分配），`repo/` 只放读取、校验与使用它的代码。
- **测试放模块旁的 `__tests__/`**，由包自己的 `test` 脚本按显式 glob 运行；`test-scripts` 已排除本包，不要在两处登记。glob 必须写到 `__tests__/`：直接传目录时 Node 的默认模式会把 `test-*.mjs` 当成空测试收进来。测试是断言脚本，不用 `node:test`（`test()` 返回 Promise，会触发 `no-floating-promises`）。
- **需要仓库根时用 `shared/repo-root.mjs`**，不要按目录深度写 `../..`。
- 本包同时被 pre-commit、PR CI 与各 workspace 构建配置消费；改动后跑根 `check-pre-commit`、`check-policy` 与本包的 `build` + `test`。
