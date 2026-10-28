# monorepo-kit

- 源码直出，没有 `build`、没有 `dist`：`exports` 全部指向 `src/**/*.mjs`。加构建步骤会让门禁跑在上一次产物上，这是这个包唯一不能接受的失效。
- 三个分区按「换仓库是否重写」划分：`shared/` 与仓库无关，`policy/` 是本仓库的门禁策略，`repo/` 是本仓库的构建与测试编排。往 `shared/` 放东西前先确认它不认识本仓库的路径、包名与语料。
- 新增文件时同名测试写在旁边；测试由本包 `test` 脚本跑（`node --test "src/**/*.test.mjs"`），`test-scripts` 已排除本包，不要在两处都登记。glob 必须显式写：直接传目录会按 Node 的默认模式收文件，`repo/test-ports.mjs` 与 `repo/test-ports.d.mts` 都匹配 `test-*`，前者被当成空测试跑一遍、后者在类型剥离阶段直接报错。
- 需要仓库根时用 `shared/repo-root.mjs` 向上查找 `pnpm-workspace.yaml`，不要按目录深度写 `../../..`。
- 改动这里会同时影响 pre-commit、PR CI 与 workspace 构建配置。改完至少跑 `pnpm run check-pre-commit`、`pnpm run check-policy` 与 `pnpm --filter @greypan/monorepo-kit test`。
