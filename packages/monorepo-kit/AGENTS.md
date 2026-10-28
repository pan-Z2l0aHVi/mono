# monorepo-kit

- 运行时源码直出，没有 JS 构建；`exports` 把 `import` 指向 `src/index.mjs`。加运行时构建会让门禁跑在上一次产物上，这是这个包唯一不能接受的失效。类型产物是例外：`build` 只跑 `tsc --emitDeclarationOnly` 写 `dist/`，`exports.types` 指向它。
- **只有一个入口，没有子路径**。新模块必须同时在 `src/index.mjs` 里导出、更新 `src/index.test.mjs` 的名字清单，然后跑 `pnpm --filter @greypan/monorepo-kit build` 重新生成声明——声明是生成物，不要手写。包内模块互相 import 用相对路径，写成 `@greypan/monorepo-kit` 会绕回入口形成环。
- 导出形式按名字冲突与否决定，不看个人偏好：`name`/`run` 是 `check-runner` 读的协议，所有检查单元都导出这两个名字，因此必须命名空间导出；其余叶子函数平铺。
- 模块顶层只做纯计算与常量校验（`repo/test-ports.mjs` 的表校验就是这一类）：不读写文件、不起子进程、不查仓库根、不写 stdout/stderr、不改 `process` 状态。入口是整包再导出，任何模块的顶层副作用都会在每个消费者身上执行一次，包括只需要一个端口函数的 `vite.config.ts`。
- 三个分区按「换仓库是否重写」划分：`shared/` 与仓库无关，`policy/` 是本仓库的门禁策略，`repo/` 是本仓库的构建与测试编排。往 `shared/` 放东西前先确认它不认识本仓库的路径、包名与语料。
- 新增文件时同名测试写在旁边；测试由本包 `test` 脚本跑（`node --test "src/**/*.test.mjs"`），`test-scripts` 已排除本包，不要在两处都登记。glob 必须显式写：直接传目录会按 Node 的默认模式收文件，`repo/test-ports.mjs` 匹配 `test-*`，会被当成空测试再跑一遍。
- 测试是断言脚本而不是 `node:test` 用例：顶层 `assert` 加一行 `all assertions passed` 输出。`node:test` 的 `test()` 返回 Promise，在本包的 lint 规则下会触发 `no-floating-promises`。
- 需要仓库根时用 `shared/repo-root.mjs` 向上查找 `pnpm-workspace.yaml`，不要按目录深度写 `../../..`。
- 改动这里会同时影响 pre-commit、PR CI 与 workspace 构建配置。改完至少跑 `pnpm run check-pre-commit`、`pnpm run check-policy` 与 `pnpm --filter @greypan/monorepo-kit build` + `test`；`test` 读 `dist/` 里的声明，turbo 会先建好。
