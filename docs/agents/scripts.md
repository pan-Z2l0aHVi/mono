# 脚本

本文件规定仓库内脚本的准入、测试与运行边界。`.github/scripts/**` 属于 GitHub workflow，由 workflow 自身的规则与检查约束，不在本文件范围内。命令命名与 namespace 归属见 [`commands.md`](commands.md)，授权机制见 [`workflow.md`](workflow.md#怎么取得这个授权)，验证选择见 [`verification.md`](verification.md)，mise 包装见 [`worktree.md`](worktree.md#mise-exec-与命令外壳)。

## 范围

本文件覆盖两类可执行入口，按影响范围划分：

- **根 `scripts/`**：由根 `package.json`、Git hook、CI 或流程文档直接调用，影响整个仓库。
- **workspace 内 `scripts/`**：由所属包或应用的构建、发布或生成流程调用，影响范围限于该 workspace。

`scripts/lib/**` 是共享实现与原子检查实现，不是入口，其行为由调用方与同名测试覆盖。

## 准入

新增脚本前，先证明现有命令、配置或工具无法表达该约束，并写清调用方、触发频率与失效后果。只有同时满足以下条件才落成永久脚本：

- 有稳定的调用方；
- 同一套判断或副作用会反复执行，手工执行容易漂移；
- 放在现有命令、配置或一次性 task 里都不合适。

一次性操作、临时编排和只服务当前改动的逻辑不新增脚本；写成 task 命令、PR 描述或一次性调查记录。

## 运行时选择

默认优先 POSIX `sh`：系统探测、依赖与环境处理、发布编排，以及把外部 CLI 串成流程的脚本。只有复杂逻辑才用 Node ESM：结构化解析（JSON/YAML/Markdown）、代码生成、状态机、跨平台路径处理，或需要复用 `scripts/lib/**` 的原子实现。检查门禁仍统一使用 Node ESM（ADR-0027 §6）；其余脚本在 `sh` 能直接表达时选 `sh`，不要为几行命令串联引入 Node。

- 不在 `sh` 里拼接执行 Node 源码：不写 `node -e`、`node - <<EOF`，也不把 JS 存进变量再执行。
- 不在 Node 里用 `sh -c` 或启动 `.sh` 辅助脚本完成本可由 argv 表达的工作；外部 CLI（`git`、`pnpm`、`gh`、`turbo`、`ps` 等）以 argv 调用不在此列。
- 测试为验证 shell 行为而启动 `sh` 是允许的；禁令针对实现代码，不针对测试夹具。
- bootstrap 例外只允许来自 `.mise.toml` 在 Node 可用前求值的 `[env]` 模板；每个例外的等价实现、降级行为与测试要求见 `.mise.toml` 与 `docs/agents/worktree.md`。新增同类场景必须同时提供等价实现并证明一致，无法提供时登记为明确例外，不要假装存在等价实现。

## 根脚本

### 执行面

根 `scripts/` 按执行面分为 `checks/`（门禁与脚本测试入口）、`workflow/`（提交命令）、`release/`（发布辅助）、`maintenance/`（清理、环境诊断与依赖维护）与 `lib/`（共享实现与原子检查实现）。门禁入口通过 `check-*` 根命令调用；`checks/` 只放薄入口，同一端点的检查由一个入口聚合，检查逻辑放在 `lib/` 的原子模块里。分类与入口契约见 ADR-0027。

### 授权

新增、删除根脚本，或改变它们暴露的根命令，属于仓库级共享配置变更，必须按 [`workflow.md`](workflow.md#怎么取得这个授权) 逐次取得用户明确授权。计划批准不等于脚本授权；没有授权时只做只读调查，或把方案写成待决事项。

### 测试

测试可选：没有测试文件合法。一旦存在测试文件，必须与被测文件同目录同名（`foo.mjs` / `foo.ts` / `foo.sh` → `foo.test.mjs`）；新增或重命名测试文件时，同名关系在同一变更里成立。

测试针对原子函数或共享实现，不针对只做聚合的入口。覆盖按风险选择，至少包括参数解析、成功输出与退出码、失败路径，以及脚本声称的副作用。`scripts/checks/` 只放薄入口，检查实现与同名测试在 `scripts/lib/`；入口本身不要求专属测试。

`test-scripts` 只运行已存在的 tracked `*.test.mjs`，不证明每个入口都有测试；覆盖完整性由 review 检查。共享实现（`scripts/lib/**`）的测试同样可选，存在时必须同名。

### 运行边界

- 仓库级校验与生成脚本应能从任意 cwd 运行，用 `import.meta.dirname` 定位仓库根；必须以调用者仓库为上下文的 Git 或任务脚本，应显式用 `git rev-parse --show-toplevel` 解析并校验，不假定 cwd 就是仓库根。
- 脚本必须非交互：不等待 stdin，不以 TTY 或人工确认为成功条件；失败必须非零退出并给出可定位的错误。
- 需要调用被钉工具时，按 [`worktree.md`](worktree.md#mise-exec-与命令外壳) 的 mise 包装规则执行。

## Workspace 脚本

workspace 脚本的影响范围限于所属 workspace，职责是承载该 workspace 的构建、发布或生成编排。它们不适用根脚本的逐次授权要求，但仍适用上文的准入与同名测试原则。

- **授权**：新增或修改 workspace 脚本属于常规实施改动，不需要逐次取得用户授权；由 task 级别对应的 review 把关。脚本触发发布、对外交付或其他不可逆副作用时，执行该操作仍按 [`workflow.md`](workflow.md#怎么取得这个授权) 单独授权。
- **测试**：与根脚本一致，测试可选；一旦存在测试文件，必须与被测文件同目录同名（`foo.mjs` / `foo.ts` / `foo.sh` → `foo.test.mjs`）。测试针对脚本本身，至少覆盖参数、成功输出与退出码、失败路径，以及脚本声称的副作用；不能只靠调用方的集成测试替代。
- **边界**：不得成为其他 workspace 的隐式入口；跨 workspace 复用的逻辑上移到共享包或根 `scripts/lib/**`。
- **运行**：同样必须非交互，失败非零退出；调用被钉工具时按 [`worktree.md`](worktree.md#mise-exec-与命令外壳) 的 mise 包装规则执行。
