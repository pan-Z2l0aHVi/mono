# Worktree 执行环境与共享缓存

本文件拥有 worktree 准备与执行环境的几件互相关联的事：在一个新 worktree 里把工具链准备好、按任务收缩视野、让各 worktree 共享同一份构建缓存、以及在未激活 mise 的 shell 里正确执行命令。它们的共同线索是「拿到一个 worktree 之后怎么正确执行命令」，所以放在一起。

worktree 本身是任务隔离边界，不是包名的别名。包清单、依赖边界与发布边界以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为权威；客户端权限边界见 [`environments.md`](./environments.md)；mise/turbo 的 env 注入由本文承担；提交边界的授权口径见 [`commit.md`](./commit.md)。

## 编排层与归属

一个可变 task 只能有一个 owner 和一个实施 worktree；怎么创建、放在哪、用什么命令建、由谁清理，都由编排层决定，仓库不规定。共享主工作区只用于只读调查与状态查询，合并通过远端 PR 完成，不在共享工作区里做。owner 与 worktree 的唯一性边界见根 [`AGENTS.md`](../../AGENTS.md)。

编排层交接 task 时会带上 worktree 路径、base SHA 和 owner 标识，执行者用 task-ledger skill 的 `new` 子命令的 `--owner` 与 `--base` 记录归属与起点，并把 worktree 路径填进 Task Packet 的 `Worktree`，不自行推导或改写。交接后归属变更属编排层的动作，仓库侧不提供重新归属命令。禁止靠 pane 名称或目录名推断归属。

## 新 worktree 的三步准备

编排层交付一个新 worktree 后，收到它的执行者必须在实施前依次跑 `mise install`、`mise exec -- pnpm install --frozen-lockfile`、`mise exec -- pnpm run build`，三步都不能省。

`mise install` 排第一，因为工具链版本由 [`.mise.toml`](../../.mise.toml) 钉住，不同分支可能钉不同版本；它幂等，装过就是一次快速 no-op。

显式运行根 `fix-code` 或 `check-code` 前需要 `node_modules`；完整环境还须构建 workspace 包的 `dist` 类型产物。缺少产物时，`vp check` 会把跨包 import 报成假 `TS2307`，类型感知验证随之不可用。`fix-code` 会修改工作树内容，但不会自动暂存；整理后先检查 diff，再选择要暂存的文件。

## 按任务收缩视野

三步准备完成后、任务交给实施 agent 前，编排层可以按任务目标把 sparse checkout 收缩到目标包及其 turbo 依赖闭包，减少无关代码的上下文占用。顺序不能颠倒：闭包来自 turbo 图，`turbo ls` 在未安装依赖的 worktree 里跑不起来。

调用方式与稀疏树里的搜索、gate、install 规则见 [`.agents/skills/turbo-sparse-scope/SKILL.md`](../../.agents/skills/turbo-sparse-scope/SKILL.md)。对这里的环境准备只有一条后果需要记住：被隐藏包的目录里没有未跟踪文件时，整个目录（含被忽略的 `node_modules`、`dist`）随 cone 删除；`--restore` 只带回已跟踪文件，恢复后要重跑 `pnpm install --frozen-lockfile` 与 `pnpm run build`。

## Turbo artifact cache

`TURBO_CACHE_DIR` 指向系统临时目录下的 `<temp>/greypan/turbo-cache/<repo-id>`。[`scripts/lib/turbo-cache-dir.sh`](../../scripts/lib/turbo-cache-dir.sh) 是唯一的路径解析器，`.mise.toml`、`clean.sh` 与 `env-doctor` 都调用它：它把 Git common directory 解析为物理路径，再用 `git hash-object --stdin` 计算稳定 ID。主仓及其 linked worktree 因共用 Git common directory 而复用同一缓存；独立 clone 有不同的 common directory 和缓存 ID。helper 不创建目录、不写 Git 对象，也不读取继承的 `TURBO_CACHE_DIR`。

Turbo artifact cache 保存可恢复的构建产物，包括 `dist` 与声明文件。新路径首次构建时是冷缓存，系统回收临时目录后 Turbo 会重新构建产物。

`pnpm run clean` 默认清理当前仓库工作区里的构建产物、`node_modules`、`.turbo/`，以及当前 repo-id 的临时 artifact cache；它忽略外部注入的 `TURBO_CACHE_DIR`，不触及其他仓库的缓存。`--dry-run` 只列出当前目标，不删除文件；[`pnpm-lock.yaml`](../../pnpm-lock.yaml) 仍须显式传 `--locks`。`<workspace>/.turbo/` 是工作区内的本地目录，不是共享 artifact cache；删它不会回收外部缓存，也不等同于清理 `dist/`。

CI 在 [`ci.yml`](../../.github/workflows/ci.yml) 显式把 artifact cache 放到 `${{ github.workspace }}/.turbo`，并由 `actions/cache` 保存和恢复；mise 优先保留该 override。其他 GitHub Actions runner 在没有显式值时用 `GITHUB_WORKSPACE/.turbo`，因此 Windows runner 不会调用 POSIX helper。本地与不完整的 CI 环境由 helper 计算 canonical 临时路径。

构建或验证前怀疑 `dist` 产物异常（例如被 watch 进程清空 d.ts）时，先裸跑 `pnpm run agent:env-doctor` 体检，再用 `pnpm run agent:env-doctor --fix`（自动 `turbo build --force`）或手动 `turbo build --force` 重建。doctor 按同一公式得到的本地 canonical 路径判断注入；CI workspace override 不会作为它自己的预期值。

Codex 线程能不能写共享 Turbo cache，取决于客户端的权限配置，见 [`environments.md`](./environments.md)。

### 缓存可信链

`turbo-cache-invariant` 检查（经 `pnpm run check-policy` 执行）要求 `test.dependsOn` 含 `^build`、`build.outputs` 含 `dist/**` 且没有可能排除 `dist` 的负模式，并且 `test.inputs` 不含会显式收进 `dist` 的正模式。不能靠把 `dist/**` 加进 `inputs` 解决缓存问题：`dist` 是 gitignored，`$TURBO_DEFAULT$` 本来不会收它，显式正模式反而让尚无 `dist` 的新 worktree 全部 miss，却不增加产出恢复的正确性。

同一族的 `turbo-input-paths`（`check-pre-commit` 与 `check-policy` 都跑）钉另一个方向：`turbo.json` 里指向不存在文件的正模式不报错，只是收不进任何文件，任务因此静默停止失效——被改动的实现或配置不再让缓存键变化，测试却看起来仍然绿。它从 `pnpm-workspace.yaml` 列出根与每个 workspace 的 `turbo.json`，逐个判 `$TURBO_ROOT$` 条目能否命中。排除项不判：排除项打偏只会多算输入，方向是保守的。

## Go 缓存探测与共享

[`.mise.toml`](../../.mise.toml) 的 `[env]` 里 `GOCACHE` 通过 `exec` 模板在 `HERDR_ENV=1` 时运行一段探测：先按平台试默认缓存目录（macOS 为 `~/Library/Caches/go-build`，Linux 为 `~/.cache/go-build`），再试另一平台的路径，都不可写才回落到 `$TMPDIR/greypan/go-build`。探测由 [`scripts/lib/go-cache-dir.sh`](../../scripts/lib/go-cache-dir.sh) 实现，是 [`.mise.toml`](../../.mise.toml) bootstrap 的明确例外（只有 shell 实现）；[`go-cache-dir.test.mjs`](../../scripts/lib/go-cache-dir.test.mjs) 钉住平台优先、单行输出、exit 0 与探测文件清理。目的是让各工作区共享同一份 Go 缓存，而不是各自散在临时目录里。

探测命令**永远 exit 0、仅输出一行**，这是 Tera 渲染的要求；`HERDR_ENV` 在场而 `TMPDIR` 为空时条件判假，避免渲染成根路径 `/greypan/go-build`。

没有 `HERDR_ENV` 时模板渲染为空，Go 自行使用平台默认路径——在 macOS 上就是探测会选中的那个目录，所以结果一致，CI 也是如此（[`ci.yml`](../../.github/workflows/ci.yml) 的 `actions/cache` 读 `go env GOCACHE` 的默认值，不受影响）。**这条链路不挑客户端**：任何 agent 在 mise 激活过的 shell 里都落在同一个缓存上，探测没跑到也只是退回平台默认。

要确认当前拿到的路径，跑 `mise exec -- go env GOCACHE`。

## mise exec 与命令外壳

[`.mise.toml`](../../.mise.toml) 钉住工具链版本，并在 `[env]` 注入 `TURBO_CACHE_DIR`。这套注入只对 **mise 激活过的 shell** 生效：交互式终端（含终端复用器里的 pane）由 mise 自动激活，agent 的工具宿主、`git hook`、`bash -c` 与外部脚本通常没有。判定要不要加 `mise exec --` 只看一条：**这条命令是否依赖 mise 注入的 env，或 PATH 上被钉住的工具**——经 turbo 的命令两者都依赖，调用 node / pnpm / go 的命令依赖后者；纯粹读写文件、或工具全部由 `node_modules` 提供的命令可以直接跑，拿不准就加。一个例外是 `pnpm run agent:env-doctor`：它存在的意义就是暴露「当前 shell 没激活 mise」，加了前缀会让它用来暴露这件事的两条断言恒报 ok，所以必须裸跑。

一行快速自检，输出非空只说明 env 已被注入（CI 在 [`ci.yml`](../../.github/workflows/ci.yml) 里覆盖过这个变量也会让它非空），所以它只是提示，权威判据是 `pnpm run agent:env-doctor` 的等值断言：

```sh
echo "${TURBO_CACHE_DIR:-<unset>}"
```

让 `mise` 本体可解析和让 shim 生效是两件事：`mise` 本体只在包管理器目录（macOS 上常见 `/opt/homebrew/bin`），钉住的工具链在 `$HOME/.local/share/mise/shims`。为了让 `mise` 可解析而把 `/opt/homebrew/bin` 放到 PATH 最前，会让 Homebrew 的 node 抢在 shim 之前，于是裸跑的 `pnpm` 用的是另一版 node；确实需要两者都在场时，把 shims 放在 Homebrew 之前，或直接用 `mise exec --`。

为什么不能靠 turbo 兜底：它的 hash 只记录 [`package.json`](../../package.json) 里 `engines` 的版本**范围**，不记录真实工具链，所以宿主 PATH 上另一版 node 跑出的构建与钉住版本跑出的构建落在同一个 hash 上。由此有两种各自成立的失效，正是要分开防的两件事——env 没注入时 turbo 落到默认缓存位置，命中不了共享缓存；env 指向共享缓存而 node 不是钉住那一版时，会在同一 hash 下写进工具链不符的产物，之后的命中把它当有效缓存恢复出来。`pnpm run agent:env-doctor` 把这两条事实变成可检测断言：本地 `TURBO_CACHE_DIR` 必须等于路径 helper 计算的 canonical 临时缓存路径，当前 node 必须等于 `[tools]` 钉住的版本，不符即 fail。
