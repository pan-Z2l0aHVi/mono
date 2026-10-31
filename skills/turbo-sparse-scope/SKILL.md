---
name: turbo-sparse-scope
description: 按 Turborepo 依赖图把当前 worktree 的 git sparse checkout 收缩到目标包及其传递依赖闭包，并约束稀疏树里的全局搜索与验证口径。用于编排层给实施 agent 准备视野，或 agent 只处理少量 app/package 时。
---

# Turbo Sparse Scope

## 何时使用

- 编排层交付 worktree 后、在任务开始前按任务目标收缩视野：`apps/` 是主要收益面。
- agent 收到「只改某个 app，不要加载无关代码」这类任务，且当前是全树。
- 不用于全仓影响面分析、全仓 gate，或尚未完成 install/build 的 worktree。`packages/` 多为通用包、被 `apps/` 广泛依赖，对它们收缩收益小、误判成本高。

闭包由脚本计算，不靠 agent 猜文件范围。工作区收缩之后，实施 agent 追加下面「稀疏树里的安全规则」。

## 运行

在 worktree 根目录运行（脚本只依赖 Node 内置模块）。同步依赖需要 `pnpm` 在 PATH 上，未激活 mise 的 shell 用 `mise exec -- node ...` 调用：

```sh
mise exec -- node .agents/skills/turbo-sparse-scope/sparse-scope.mjs <package-name|package-path>... [--dry-run] [--add|--reset] [--json]
mise exec -- node .agents/skills/turbo-sparse-scope/sparse-scope.mjs --status [--json]
mise exec -- node .agents/skills/turbo-sparse-scope/sparse-scope.mjs --restore [--json]
```

| 参数         | 作用                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| 目标（必需） | 包名或仓库相对路径，可多个；都按 turbo `"<pkg>..."` 取包及其传递依赖     |
| `--add`      | 与当前 cone 取并集（任务扩展时用）                                       |
| `--reset`    | 用新闭包替换当前 cone                                                    |
| `--dry-run`  | 只计算并打印 cone 与将执行的命令，不动工作区；要求当前是全树             |
| `--restore`  | `git sparse-checkout disable`，恢复全树                                  |
| `--status`   | 只读：当前 cone、配置状态、cone 外的未提交文件、提醒                     |
| `--json`     | stdout 输出机器可读报告；被隐藏的包列在 `hiddenPackages`                 |

退出码：`0` 成功，`1` 环境或运行失败（缺配置、turbo 失败、git 失败、依赖同步失败），`2` 用法或目标错误（未知参数、未知包、稀疏树上做了不允许的动作）。`--status` 对配置问题只诊断：缺配置或配置无效写进报告的 `config` 与 `warnings`，仍 exit 0；git 命令失败仍是 exit 1。

成功收缩后，只要根目录有 `pnpm-workspace.yaml` 且 `pnpm` 在 PATH 上，脚本会接着跑一次 `pnpm install --frozen-lockfile`，结果写在报告的 `dependencies`（`synced`；`--dry-run` 为 `would-sync`）。跳过时（没有 workspace 文件或找不到 pnpm）报告 `skipped` 并给出原因，此时必须在跑任何 pnpm 脚本前手动同步。原因见下面规则 7。

## 范围怎么算

- cone = 目标闭包目录 + `keepPackages` 闭包目录 + `keepDirs` + 目标目录本身，去重排序后一次性 `git sparse-checkout set --cone`。
- 已经稀疏时，脚本先 `git sparse-checkout disable` 恢复全树再重算：turbo 图在稀疏树里会静默截断，没有全树就没有可信闭包。随后按 `--add`（旧 cone 与新 cone 取并集）或 `--reset`（替换）落盘。稀疏树上的默认动作和 `--dry-run` 直接拒绝，并把当前 cone 打在错误里。
- 重算或落盘阶段的任何失败（未知包、turbo 失败、cone 自检失败、依赖同步失败）都会尽力回到失败前的状态：稀疏起步装回上一个 cone，stderr 写 `previous sparse cone restored`；全树起步保持全树，stderr 写 `sparse checkout disabled; the worktree is full`。只有恢复本身也失败时才提示工作区状态未复原。
- 未暂存的修改与未跟踪文件留在工作区，但不再属于 cone；已暂存且工作区与索引一致的改动（新增、修改、重命名）会随 cone 移出工作区，未暂存的删除在收缩后不再显示。收缩不改暂存内容，只在索引里写 skip-worktree 位：`--restore` 后暂存内容恢复为暂存版本，纯未暂存删除按 HEAD 重建，已暂存的删除文件不会回到工作区；工作区与索引不一致的路径不会被移出。脚本把它们列在 `dirtyOutsideCone` 里。`hiddenPackages` 按路径判断，因此 `--add` 保留的包不会误报为隐藏。
- 每次先 `init --cone` 再 `set --cone`；`--reset` 重复应用同一闭包结果不变，默认动作在已稀疏时按上面的规则拒绝。不需要，也不要手改 `.git/info/sparse-checkout`。

## 配置

配置在根 [`monorepo.json`](../../monorepo.json) 的 `sparseScope`：

```json
{
  "sparseScope": {
    "keepDirs": ["docs", ".agents", ".claude", "skills", "scripts", ".vite-hooks", ".github"],
    "keepPackages": ["@greypan/monorepo-kit"]
  }
}
```

- `keepDirs`：始终检出的仓库相对目录，放指令面、脚本、hook 与 CI 定义。脚本会校验每项是真实目录；它自身所在的 skill 目录必须在 cone 内，否则拒绝执行。
- `keepPackages`：始终检出的包及其闭包。`@greypan/monorepo-kit` 被预提交 hook 与门禁脚本 import；`turbo run build --filter=@greypan/monorepo-kit` 之后才能跑 `check-pre-commit`。未知包名视为配置错误。

## 稀疏树里的安全规则

1. **全局引用搜索只用 `git grep <pattern> HEAD`。** `rg`、`grep -r`、Glob 只看已检出的文件，闭包外的调用者会静默消失，影响面结论因此偏乐观。`git grep` 也接受 `HEAD -- <path>` 限定范围；未提交的暂存内容不在 HEAD 里，另用 `git grep --cached`。
2. **manifest 级影响面可直接算，源引用搜索仍要完整 Git 树。** [`monorepo-change-impact`](../monorepo-change-impact/SKILL.md) 的 `repo-query` 会从 Git 索引补读被 skip-worktree 隐藏的 manifest，`contract`、`verify` 的 workspace 图与 `contract-diff` 不需要先 `--restore`；但被隐藏的源文件不在磁盘上，跨包调用者与字符串引用仍按规则 1 搜索。被隐藏包的 README/AGENTS.md 与包内测试同样不在磁盘上：读取用 `git show HEAD:<path>`，要执行就先 `--add <package>`。
3. **全仓 gate 先 `--restore`，或交给 CI。** 本地验证只覆盖 cone；`test-scripts`、`check-context`、`check-policy` 按 tracked 文件扫描，cone 外的文件不会参与。收缩期间的本地结论要标明覆盖范围。
4. **任务扩展时用 `--add`。** 不扩大范围就用 `--reset` 或默认动作重建，不要手写路径。
5. **不要在稀疏树里用 `turbo run` 期待全仓结果。** 需要全仓图时先 `--restore`。
6. **提交照常进行。** cone 外的已跟踪文件只是没检出，不影响 commit；合并、rebase、切换分支前先 `--restore`，避免 cone 外路径的冲突要手工处理。
7. **收缩后不要再跑不带 `--frozen-lockfile` 的 `pnpm install`。** 它只看到 cone 内的 workspace，会把 `pnpm-lock.yaml` 重写成缩小的图（隐藏 workspace 与只被它们使用的 catalog 条目会被删掉）。更隐蔽的是 pnpm 在 `pnpm run` 前的隐式安装（`verifyDepsBeforeRun`）：收缩删掉了隐藏包的目录和 `node_modules` 后，它发现 install 状态与当前 workspace 集不一致，会在跑命令前自动做一次**非 frozen** 安装，hook 仍然 exit 0，锁文件却已被改写。脚本在收缩后自动做的 frozen 安装就是为了消除这个不一致，让后续脚本不再触发隐式安装；报告里 `dependencies: skipped` 时先手动跑 `pnpm install --frozen-lockfile` 再执行任何 pnpm 脚本。要真正重装依赖就先 `--restore`。
8. **`--restore` 之后补装依赖并重建。** 被隐藏包的目录里没有未跟踪文件时，整个目录（含被忽略的 `node_modules`、`dist`）随 cone 一起删除；有未跟踪文件时只删已跟踪文件，目录与其中的忽略内容保留（git 打 warning）。`--restore` 只带回已跟踪文件，恢复后要重跑 `pnpm install --frozen-lockfile` 与 `pnpm build`，缓存命中时都很快。
9. **`.changeset/` 不在 cone 内。** 改到发布包时仍要新建 changeset 文件（目录被删除就重新创建；新建的是未跟踪文件，不会被后续收缩删除）；changeset gate 只在 CI 跑，本地门禁不会提醒。

## 已知边界

- 只计算 `target...`（目标及其依赖）。被依赖闭包（谁用了目标）不扩大 sparse 范围，靠 `git grep HEAD` 解决。
- **包外文件读取不在 turbo 依赖图里。** 测试、脚本或生成器按相对路径读取其他包或 app 的文件时，依赖图看不到这条边；收缩后这些文件可能被隐藏，相关命令因此失败，但目标包代码未必有问题。把文件所属的包用 `--add` 纳入，或先 `--restore`/交给 CI 验证，不要把这类失败归因于目标改动。
- 依赖 turbo 的 `ls` 输出：优先 `--output=json`，失败降级解析文本，两者都失败就报错并附原始输出，不猜。
- `turbo ls` 与 `ls --filter` 各调用一次；闭包解析不随包数平方增长，但百级包仍需评估耗时。
- 平台自带的静态 sparse 配置（如 Claude Code 的 `worktree.sparsePaths`）能覆盖固定范围时，本 skill 的价值是「按依赖图动态计算」。
- 它减少的是上下文占用，不是权限边界：被隐藏的文件仍可用 `git show HEAD:<path>` 读取。
