# monorepo-kit

- 源码直出，没有 `build`、没有 `dist`：`exports` 只有 `.` → `src/index.mjs`。加构建步骤会让门禁跑在上一次产物上，这是这个包唯一不能接受的失效。
- **只有一个入口，没有子路径**。新模块必须同时在 `src/index.mjs` 里导出、在 `src/index.d.mts` 里声明，并更新 `src/index.test.mjs` 的名字清单——三处漏一处测试就红。包内模块互相 import 用相对路径，写成 `@greypan/monorepo-kit` 会绕回入口形成环。
- 导出形式按名字冲突与否决定，不看个人偏好：`name`/`run` 是 `check-runner` 读的协议，所有检查单元都导出这两个名字，因此必须命名空间导出；其余叶子函数平铺。
- 三个分区按「换仓库是否重写」划分：`shared/` 与仓库无关，`policy/` 是本仓库的门禁策略，`repo/` 是本仓库的构建与测试编排。往 `shared/` 放东西前先确认它不认识本仓库的路径、包名与语料。
- 新增文件时同名测试写在旁边；测试由本包 `test` 脚本跑（`node --test "src/**/*.test.mjs"`），`test-scripts` 已排除本包，不要在两处都登记。glob 必须显式写：直接传目录会按 Node 的默认模式收文件，`repo/test-ports.mjs` 与 `repo/test-ports.d.mts` 都匹配 `test-*`，前者被当成空测试跑一遍、后者在类型剥离阶段直接报错。
- 测试是断言脚本而不是 `node:test` 用例：顶层 `assert` 加一行 `all assertions passed` 输出。`node:test` 的 `test()` 返回 Promise，在本包的 lint 规则下会触发 `no-floating-promises`。
- 需要仓库根时用 `shared/repo-root.mjs` 向上查找 `pnpm-workspace.yaml`，不要按目录深度写 `../../..`。
- 改动这里会同时影响 pre-commit、PR CI 与 workspace 构建配置。改完至少跑 `pnpm run check-pre-commit`、`pnpm run check-policy` 与 `pnpm --filter @greypan/monorepo-kit test`。
