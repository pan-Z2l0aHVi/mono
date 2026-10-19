# ADR-0027: 脚本按执行面分类与统一入口

- **Date**: 2026-10-19
- **Status**: 已接受
- **Relates to**: [ADR-0014](0014-task-system-v2.md)（政策检查挂载点）、[ADR-0025](0025-pr-review-flow.md)（pre-commit 与 PR CI 的检查集合）

2026-10-19 修订：task 分级与记账已提取为通用 task-ledger skill（ADR-0028 为纯文本），`scripts/workflow/` 只保留 commit helper；§1 执行面表与 §5 目录树已同步。

## 背景与取舍

根 `scripts/` 混放检查、agent 工具、发布与运维脚本；`.agents/checks/` 是 task 系统留下的政策检查挂载点；`.github/scripts/` 存放 workflow 与发布编排。同一组检查还被 pre-commit、PR CI、拓扑测试和文档分别硬编码，新增或改名需要同步多处。

检查本身并不慢。2026-10-19 在本机实测，四个静态检查顺序执行的合计约 0.7 秒，主要成本是 `find`/`awk`/`grep` 子进程；`mise exec` 的启动约 0.05 秒。真正可能拉长提交时间的是 `format-clean` 调用的 `vp check`、`stylelint` 与 `gofmt`。因此这次重构不以并行提速为主要收益，而是解决三件事：成员清单分散、shell 与 Node 两套解析逻辑、脚本目录没有按执行面分类。

`.agents/checks/` 的原始职责已经消失：ADR-0025 退役了 task 阶段 gate，检查不再读取 `AGENT_TASK_*`，`changeset-required` 也改成由 CI 传入 PR base/head。继续把它留在 agent context 目录，只会让 CI 依赖一个语义上不属于它的路径。

本次范围只到根 `scripts/`：`.github/scripts/**` 继续由 workflow 拥有，`apps/*/scripts` 与 `packages/*/scripts` 保持原位，它们的影响范围限于所属 workflow 或 workspace。

## 决策

### 1. 按执行面分类，一个端点一个入口

端点按“谁触发、输入是什么、失败意味着什么”划分，而不是只按 `pull_request` 这个触发事件划分。同一端点的多个判断收敛为一个薄入口；不同端点即使都在 CI 里运行，也不强行合并。五个门禁入口全部通过根命令调用：

| 执行面          | 根命令             | 入口                                  | 聚合内容                                                                                                           | 失败语义                               |
| --------------- | ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| git hook        | `check-pre-commit` | `scripts/checks/check-pre-commit.mjs` | `command-conventions`、`format-clean`、`no-mutual-links`、`turbo-cache-invariant`、`web-ui-docs-inputs`            | 任一检查失败即非零退出，阻止提交       |
| PR CI policy    | `check-policy`     | `scripts/checks/check-policy.mjs`     | `command-conventions`、`interweave-turbo-inputs`、`no-mutual-links`、`turbo-cache-invariant`、`web-ui-docs-inputs` | 任一检查失败即 job 失败                |
| PR CI changeset | `check-changeset`  | `scripts/checks/check-changeset.mjs`  | `changeset status --since` 与 `changeset-policy`                                                                   | 任一检查失败即 job 失败                |
| CI context      | `check-context`    | `scripts/checks/check-context.mjs`    | context invariants，保留 `--report` 模式                                                                           | 链接、路由、语料漂移失败即非零         |
| CI package      | `check-pack`       | `scripts/checks/check-pack.mjs`       | 发布包契约                                                                                                         | 发布契约失败即非零                     |
| 提交辅助        | —                  | `scripts/workflow/commit.sh`          | 提交辅助                                                                                                           | 命令自身退出码                         |
| 发布            | `publish-new-pack` | `scripts/release/publish-new-pack.sh` | 发布辅助                                                                                                           | 不可逆操作，按发布授权与 workflow 约束 |
| 运维            | `clean`            | `scripts/maintenance/clean.sh`        | 清理与运维                                                                                                         | 命令自身退出码                         |

`check-context` 与 `check-pack` 保持独立入口，不并入 `check-policy`：前者有 `--report` 模式，后者依赖构建产物，它们的输入和生命周期与快速政策检查不同。`check-changeset` 合并原来的外部 `changeset status --since` 与自定义内容检查，使 CI 的 changeset step 只有一个命令。

迁移时检查集合与位置不变：`format-clean` 只出现在 hook 面，CI 的 `check-code` 已经对全仓做格式、lint、类型与 Go 检查；`changeset` 只出现在 CI 面，它需要 PR base/head，本地提交没有这个输入。后续新增的 `interweave-turbo-inputs` 只进入 policy 面：它要跑多次 Turbo dry-run，属于 PR 政策成本，不进入提交边界。

### 2. 入口与调用方

`check-pre-commit.mjs` 和 `check-policy.mjs` 只做三件事：声明该端点的检查函数列表、用 `Promise.all` 并发运行、把失败转成非零退出。检查逻辑放在各自的原子模块里，入口不复制判断。

- hook 调用 `mise exec -- pnpm run check-pre-commit`。
- CI policy step 调用 `pnpm run check-policy`。
- CI changeset step 调用 `pnpm run check-changeset --base <sha> --head <sha>`。
- CI context step 调用 `pnpm run check-context`。
- CI package step 调用 `pnpm run check-pack`。

共享的 `scripts/lib/check-runner.mjs` 负责并发调用、错误包装与统一输出；入口只提供检查清单和参数。`Promise.all` 的语义就是本决策要的语义：第一个失败即整体失败，不会出现“部分通过”。它不会取消已经启动的同级检查，因此所有检查必须满足下面的只读不变量；进程在拒绝后退出，未完成的检查被遗弃是安全的。

`.github/scripts/lib/workflow-topology.mjs` 只断言 workflow 调用了哪个根命令、传了什么参数，不再硬编码单个检查名；pre-commit 的断言同理。

### 3. 原子检查函数

每个原子检查模块导出 `async function run(context)`，由入口调用；需要独立执行的端点可以保留一个薄 CLI 包装。`context` 至少包含 `root` 与 `mode`，需要 PR 参数的检查再读取 `base` / `head`，需要 staged 文件的检查读取 `stagedFiles`。

- 检查函数不得调用 `process.exit`，失败必须抛出带检查名的错误。
- 检查只读：不写文件、不改 Git index、不访问网络；允许启动只读的外部工具（如 `vp check`、`stylelint`、`gofmt`、`changeset status`）。
- 检查失败必须给出可定位的原因；入口负责把错误归因到具体检查并输出。
- 聚合入口只声明检查集合，不包含检查逻辑。
- 测试针对原子函数或共享实现，不针对只做聚合的入口。

`format-clean` 是唯一会启动较重外部工具的检查。它的三个子调用彼此独立，可以在函数内部用 `Promise.all` 并发；它们仍属于同一个检查，任何一个失败都让该检查失败。

### 4. 删除 `.agents/checks/`

`.agents/checks/` 下的入口全部迁入 `scripts/checks/`，检查逻辑改写为 `scripts/lib/` 下的函数模块：

- `command-conventions`、`format-clean`、`no-mutual-links`、`turbo-cache-invariant`、`web-ui-docs-inputs` → `scripts/lib/*.mjs`。
- `changeset-required` 的自定义内容检查 → `scripts/lib/changeset-policy.mjs`，由 `scripts/checks/check-changeset.mjs` 与外部 `changeset status` 一起聚合。

迁移在同一个 PR 内完成，按顺序提交：先落地原子函数、共享库与测试，再切换 `.vite-hooks/pre-commit`、`.github/workflows/ci.yml` 与 `.github/scripts/lib/workflow-topology.mjs`（含其测试），最后删除 `.agents/checks/`。不保留软链或兼容 alias，避免两个可执行事实源。活文档、hook、CI 与拓扑测试中的引用同步更新；历史 ADR 与研究记录保留原文。

### 5. `scripts/` 分类

根 `scripts/` 按执行面分为四个入口目录加一个共享实现目录：

```text
scripts/
  checks/                  # 只读门禁薄入口：hook、policy、changeset、context、package
    check-pre-commit.mjs   # hook 薄入口
    check-policy.mjs       # PR CI policy 薄入口
    check-changeset.mjs    # PR CI changeset 入口
    check-context.mjs      # CI context 入口
    check-pack.mjs         # CI package 入口
  workflow/                # 提交命令
    commit.sh
  release/                 # 发布辅助
    publish-new-pack.sh
  maintenance/             # 清理与运维
    clean.sh
    env-doctor.mjs
    update-skills.mjs
  lib/                     # 共享实现与原子检查实现，不是入口
    check-runner.mjs
    changeset-policy.mjs
    changeset-status.mjs
    command-conventions.mjs
    context-corpus.mjs
    context-invariants.mjs
    format-clean.mjs
    interweave-turbo-inputs.mjs
    no-mutual-links.mjs
    package-contract.mjs
    turbo-cache-invariant.mjs
    web-ui-docs-inputs.mjs
    workspace-manifests.mjs
    exec.mjs
    git.mjs
    config.mjs
    turbo-cache-dir.sh
    *.test.mjs             # 与原子模块同名，可选
```

`scripts/lib/` 同时承载跨检查复用的 helper 与各原子检查实现；`scripts/checks/` 只保留入口，避免入口目录重新长出实现。单次使用的解析留在所属检查实现内。workspace 内的 `apps/*/scripts` 与 `packages/*/scripts` 保持原位。根 `package.json` 的命令名除 `ci:validate-context` 改为 `check-context` 外不变，只更新目标路径；`.mise.toml` 与 `clean.sh` 对 `turbo-cache-dir.sh` 的引用同步改为 `scripts/lib/turbo-cache-dir.sh`；`env-doctor` 改用等价的 `scripts/lib/turbo-cache-dir.mjs`。

### 6. 语言与运行时

2026-10-19 修订：本节的 Node 规则只约束检查门禁。其余脚本默认优先 POSIX `sh`，尤其是系统探测、依赖与环境处理、发布编排；只有结构化解析、代码生成、状态机或跨平台路径处理等复杂逻辑才用 Node。选择细则与跨运行时禁令见 [`docs/agents/scripts.md`](../agents/scripts.md#运行时选择)。

- 检查统一使用 Node ESM。理由不是速度，而是可维护性：`JSON.parse` 替代 awk/sed 对 prettier 形状的解析，链接、git 与执行逻辑可以放进 `scripts/lib/` 共享，检查函数可以直接单测。Node 已由 mise 钉住，且在仓库中本来就是必需依赖；入口只启动一次，子进程继承同一工具链。
- 不在 `sh` 里拼接执行 Node 源码，也不在 Node 里用 `sh -c` 或启动 `.sh` 辅助脚本完成本可由 argv 表达的工作。外部 CLI 以 argv 调用不属于拼接。
- bootstrap 例外只来自 `.mise.toml` 在 Node 启动前求值的 `[env]` 模板；每个例外的等价实现、降级行为与测试要求以 `.mise.toml` 与 `docs/agents/worktree.md` 为准。
- 不再新增 sh 检查；已有 sh 检查随迁移改写为 Node。

### 7. 测试与验证

- 测试改为可选：没有测试文件合法；一旦存在测试文件，必须与被测文件同目录同名（`foo.mjs` / `foo.ts` / `foo.sh` → `foo.test.mjs`）。
- 测试只覆盖原子函数与共享实现，不覆盖只做聚合的入口。
- `test-scripts` 的发现规则不变：运行全仓 tracked 的 `*.test.mjs`。
- 每个改写后的原子检查用 fixture 覆盖成功、失败与参数边界；聚合入口靠这些原子测试与一次性的新旧差分跑验证。
- 一次性的新旧差分跑在 fixture 与当前仓库上执行，结论写入 PR 描述，不把临时 harness 提交进仓库。
- `docs/agents/scripts.md` 的范围扩展到 `scripts/checks/**` 与 `scripts/lib/**`，并改写同名测试政策；`docs/agents/commands.md` 记录 `check-*` 作为门禁入口的命名约定。

### 8. 交付顺序

一个 PR，四个有序提交：

1. **对齐文档**：修订本 ADR、更新 `docs/agents/scripts.md` 的测试政策与 `docs/agents/commands.md` 的 `check-*` 约定；删除旧的 `scripts/validate-context.test.mjs` 与 `scripts/context-invariants.test.mjs`。
2. **原子实现与入口**：在 `scripts/lib/` 落地各原子检查与共享库，在 `scripts/checks/` 落地五个薄入口，加入 `check-*` 根命令，补 fixture 测试；行为以新契约为准，不承诺旧文案逐字等价。旧入口与旧 `.agents/checks/` 暂留，使该提交可独立回滚。
3. **切换调用方**：更新 pre-commit、CI、`workflow-topology`、`package.json`；删除 `.agents/checks/` 与被替代的旧实现；确认没有双份运行。
4. **分类与收敛**：把 workflow、release、maintenance、lib 搬到目标目录，更新 `.mise.toml`、`clean.sh`、`env-doctor` 与文档路径；收敛重复的 turbo/JSON/Markdown 解析并做一次新旧差分。

每一步都按 [`docs/agents/scripts.md`](../agents/scripts.md) 逐次取得授权。搬家与削减检查必须分开；本次不增减门禁，也不改动 `.github/scripts/**` 与 workspace 脚本。

## 后果

正向：

- 每个执行面只有一个薄入口，成员清单不再在 hook、CI、拓扑测试和文档里各写一份。
- 检查函数可直接单测，共享解析与执行逻辑，不再维护两套 JSON/链接提取实现。
- `.agents/checks/` 不再让 CI 依赖 agent context 的历史路径。
- 根 `scripts/` 有稳定的分类，新增脚本时先问“属于哪个执行面”。

代价与风险：

- 所有检查共享一个 Node 运行时；入口的加载错误会让整个执行面失败。这正是 fail-closed 想要的结果，但故障域比独立进程大。
- `Promise.all` 不取消同级检查；只读不变量是安全前提。若未来出现有副作用的检查，不得直接加入并发集合。
- 重写不保证旧失败文案逐字等价；一次性的新旧差分跑只能降低风险，不能替代针对新契约的 fixture 测试。
- 测试改为可选后，机器不再保证每个入口都有测试；覆盖判断回到 review 与原子函数的 fixture 测试。
- 一个 PR 的 diff 较大；四个有序提交用于保留可回滚边界。

缓解措施：检查保持只读、幂等；错误带检查名；原子检查保留 fixture 测试；PR 中先加新实现再删旧目录；对每个改写项做一次新旧差分。若未来确实需要故障隔离，可以在不改变入口契约的前提下把单个检查改为子进程执行，而不回退目录结构。

## 备选方案

- **保留每个检查独立可执行，仅加并行 runner**：隔离性更好，但仍有多个入口、两套解析和成员清单，不能满足“同端点一个薄入口”的目标。
- **保留 `.agents/checks/`，只改调用方式**：task 系统已退役，路径语义已经失效，继续保留只会固化历史。
- **把所有 CI 检查合并进一个入口**：`check-context` 的 report 模式与 `check-pack` 的构建依赖会污染快速政策入口，也会改变 CI 步骤的失败定位；因此只合并同一执行面的检查。
- **把 checks 放到 `.github/scripts/`**：这些检查同时服务 pre-commit，不属于 GitHub workflow；`.github/scripts/**` 继续由 workflow 拥有。
- **继续用 sh 解析 `turbo.json` 与 `package.json`**：fail-closed 的 awk/sed 实现可以工作，但重复且难测；Node 的解析器与共享库更直接。
- **迁移期严格保持旧文案与退出码**：等价性更容易证明，但会把历史实现细节固化为契约；本次选择按新契约重写，并用一次性差分兜底。

## 验收

- `.agents/checks/` 不存在；活文档、hook、CI 与拓扑测试中不再引用该路径（历史 ADR 与研究记录除外）。
- hook 只调用 `pnpm run check-pre-commit`；CI 分别调用 `check-policy`、`check-changeset`、`check-context`、`check-pack`。
- 五个入口都以非零退出表示失败，并指出失败的检查名；`Promise.all` 的首个失败不会产生“部分通过”。
- `pnpm run check-pre-commit`、`pnpm run check-policy`、`pnpm run check-changeset --base <sha> --head <sha>`、`pnpm run check-context`、`pnpm run check-pack` 通过。
- `pnpm run test-scripts`、`pnpm run check-code` 与 `workflow-topology` 测试通过。
- 存在的测试文件全部与被测文件同目录同名；聚合入口没有专属测试。
