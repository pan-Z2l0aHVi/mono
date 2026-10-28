# 脚本

本文件规定仓库内脚本的准入、测试与运行边界。`.github/scripts/**` 属于 GitHub workflow，由 workflow 自身的规则与检查约束，不在本文件范围内。命令命名与 namespace 归属见 [`commands.md`](./commands.md)，授权机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)，验证选择见 [`verification.md`](./verification.md)，mise 包装见 [`worktree.md`](./worktree.md#mise-exec-与命令外壳)。

## 范围

本文件覆盖两类可执行入口，按影响范围划分：

- **根 `scripts/`**：由根 `package.json`、Git hook、CI 或流程文档直接调用，影响整个仓库。
- **workspace 内 `scripts/`**：由所属包或应用的构建、发布或生成流程调用，影响范围限于该 workspace。

`scripts/lib/**` 只放 **Node 启动之前** 要跑的东西及其测试：`.mise.toml` 的 `[env]` 模板在 Node 可用前求值，`turbo-cache-dir.sh` 与 `go-cache-dir.sh` 是这条链路的唯一实现，`go-cache-dir.test.mjs` 测的就是后者，跟着留在原处。它不是入口，也不再是通用的共享实现目录。

门禁实现与仓库编排在 workspace 包 [`packages/monorepo-kit`](../../packages/monorepo-kit) 里：运行时源码直出，类型声明由 `tsc` 生成到 `dist/`，按「换仓库是否重写」分三个分区——`shared/` 与仓库无关，`policy/` 是本仓库的门禁策略（换仓库即重写），`repo/` 是本仓库的构建与测试编排（端口表、Turbo 缓存路径）。判据是这段代码描述的是**本仓库的编排事实**还是**可复用的能力**：前者进 `policy/` 或 `repo/`，不假装通用；后者才进 `shared/`。两类都不再放回 `scripts/lib/`，因为它会在 Node 之前被求值这条约束下变成半个 bootstrap 目录。跨 workspace 复用但不是编排事实的测试基建仍单独成包（对比 `@greypan/test-kit` 的 MSW 基建，它对消费方一无所知）。分区判据、迁移理由与代价见 [ADR-0030](../adr/0030-monorepo-tooling-package.md)，端口分配与多 worktree 偏移的具体约定见 [`build.md`](./build.md#测试端口分配)。往包里加模块要改模块本身与 `src/index.mjs` 的导出，再由 `src/index.test.mjs` 的名字清单钉住，然后重新 build 生成声明。

## 准入

新增脚本前，先证明现有命令、配置或工具无法表达该约束，并写清调用方、触发频率与失效后果。只有同时满足以下条件才落成永久脚本：

- 有稳定的调用方；
- 同一套判断或副作用会反复执行，手工执行容易漂移；
- 放在现有命令、配置或一次性 task 里都不合适。

一次性操作、临时编排和只服务当前改动的逻辑不新增脚本；写成 task 命令、PR 描述或一次性调查记录。

## 运行时选择

默认优先 POSIX `sh`：系统探测、依赖与环境处理、发布编排，以及把外部 CLI 串成流程的脚本。只有复杂逻辑才用 Node ESM：结构化解析（JSON/YAML/Markdown）、代码生成、状态机、跨平台路径处理，或需要复用 `@greypan/monorepo-kit` 的原子实现。检查门禁仍统一使用 Node ESM（ADR-0027 §6）；其余脚本在 `sh` 能直接表达时选 `sh`，不要为几行命令串联引入 Node。

- 不在 `sh` 里拼接执行 Node 源码：不写 `node -e`、`node - <<EOF`，也不把 JS 存进变量再执行。
- 不在 Node 里用 `sh -c` 或启动 `.sh` 辅助脚本完成本可由 argv 表达的工作；外部 CLI（`git`、`pnpm`、`gh`、`turbo`、`ps` 等）以 argv 调用不在此列。
- 测试为验证 shell 行为而启动 `sh` 是允许的；禁令针对实现代码，不针对测试夹具。
- bootstrap 例外只允许来自 `.mise.toml` 在 Node 可用前求值的 `[env]` 模板；每个例外的等价实现、降级行为与测试要求见 `.mise.toml` 与 [`worktree.md`](./worktree.md)。新增同类场景必须同时提供等价实现并证明一致，无法提供时登记为明确例外，不要假装存在等价实现。

## 根脚本

### 执行面

根 `scripts/` 按执行面分为 `checks/`（门禁与脚本测试入口）、`workflow/`（提交命令）、`release/`（发布辅助）、`maintenance/`（清理、环境诊断与依赖维护）与 `lib/`（Node 启动前求值的 bootstrap helper）。门禁入口通过 `check-*` 根命令调用；`checks/` 只放薄入口，同一端点的检查由一个入口聚合，检查逻辑在 `@greypan/monorepo-kit` 的 `policy/` 里。包只有一个入口（`exports["."]`），入口引用一律写包名，没有子路径。分类与入口契约见 ADR-0027。

### 授权

新增、删除根脚本，或改变它们暴露的根命令，属于仓库级共享配置变更，必须按 [`workflow.md`](./workflow.md#怎么取得这个授权) 逐次取得用户明确授权。计划批准不等于脚本授权；没有授权时只做只读调查，或把方案写成待决事项。

### 测试

测试可选：没有测试文件合法。一旦存在测试文件，必须与被测文件同目录同名（`foo.mjs` / `foo.ts` / `foo.sh` → `foo.test.mjs`）；新增或重命名测试文件时，同名关系在同一变更里成立。

测试针对原子函数或共享实现，不针对只做聚合的入口。覆盖按风险选择，至少包括参数解析、成功输出与退出码、失败路径，以及脚本声称的副作用。`scripts/checks/` 只放薄入口，检查实现与同名测试在 `packages/monorepo-kit/src/policy/`；入口本身不要求专属测试。

测试有两个发现面，各自覆盖一半，不要在两处都登记同一个文件：

- `test-scripts` 运行全仓 tracked 的 `*.test.mjs`，`packages/monorepo-kit/**` 除外——那份清单覆盖 `.github/scripts`、workspace 脚本与 skills 的测试，不能收窄。
- `@greypan/monorepo-kit` 的测试由它自己的 `test` 脚本跑（`node --test "src/**/*.test.mjs"`），走 turbo 图，有依赖排序与缓存。glob 必须显式写：直接传目录会按 Node 的默认模式收文件，`repo/test-ports.mjs` 匹配 `test-*`，会被当成空测试再跑一遍。

两边都不证明每个入口都有测试；覆盖完整性由 review 检查。共享实现的测试同样可选，存在时必须同名。

### 运行边界

- 仓库级校验与生成脚本应能从任意 cwd 运行，用 `import.meta.dirname` 定位仓库根；必须以调用者仓库为上下文的 Git 或任务脚本，应显式用 `git rev-parse --show-toplevel` 解析并校验，不假定 cwd 就是仓库根。
- 脚本必须非交互：不等待 stdin，不以 TTY 或人工确认为成功条件；失败必须非零退出并给出可定位的错误。
- 需要调用被钉工具时，按 [`worktree.md`](./worktree.md#mise-exec-与命令外壳) 的 mise 包装规则执行。

## Workspace 脚本

workspace 脚本的影响范围限于所属 workspace，职责是承载该 workspace 的构建、发布或生成编排。它们不适用根脚本的逐次授权要求，但仍适用上文的准入与同名测试原则。

- **授权**：新增或修改 workspace 脚本属于常规实施改动，不需要逐次取得用户授权；新增或调整脚本中的执行超时、等待上限或重试上限，仍须按 [`workflow.md`](./workflow.md#怎么取得这个授权) 逐次取得用户明确授权。脚本触发发布、对外交付或其他不可逆副作用时，执行该操作仍按 [`workflow.md`](./workflow.md#怎么取得这个授权) 单独授权。
- **测试**：与根脚本一致，测试可选；一旦存在测试文件，必须与被测文件同目录同名（`foo.mjs` / `foo.ts` / `foo.sh` → `foo.test.mjs`）。测试针对脚本本身，至少覆盖参数、成功输出与退出码、失败路径，以及脚本声称的副作用；不能只靠调用方的集成测试替代。
- **边界**：不得成为其他 workspace 的隐式入口；跨 workspace 复用的逻辑上移到共享包。
- **运行**：同样必须非交互，失败非零退出；调用被钉工具时按 [`worktree.md`](./worktree.md#mise-exec-与命令外壳) 的 mise 包装规则执行。
