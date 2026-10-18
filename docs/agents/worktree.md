# Worktree 执行环境与共享缓存

本文件拥有三件互相关联的事：在一个新 worktree 里把工具链准备好、让各 worktree 共享同一份构建缓存、以及在未激活 mise 的 shell 里正确执行命令。它们的共同线索是「拿到一个 worktree 之后怎么正确执行命令」，所以放在一起。

worktree 本身是任务隔离边界，不是包名的别名。包清单、依赖边界与发布边界以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为权威；包级构建脚本、Vite/Turbo 配置与生成物生命周期见 `build.md`；客户端权限边界与被注入的环境变量见 [`environments.md`](environments.md)；提交边界的授权口径见 [`commit.md`](commit.md)。

## 编排层与归属

一个可变 task 只能有一个 owner 和一个实施 worktree；怎么创建、放在哪、用什么命令建、由谁清理，都由编排层（herdr-projects）决定，仓库不规定。共享主工作区只用于只读调查与状态查询，合并通过远端 PR 完成，不在共享工作区里做。owner 与 worktree 的唯一性边界见根 [`AGENTS.md`](../../AGENTS.md)。

编排层交接 task 时会带上 worktree 路径、base SHA 和 owner 标识，执行者按它们填 Task Packet 的 `Worktree`、`Base`、`Owner`，并执行 `pnpm agent:task-ledger assign` 记录归属，不自行推导或改写。交接后归属变更属编排层的动作，重新 assign 即可。禁止靠 pane 名称或目录名推断归属。

## 新 worktree 的三步准备

编排层交付一个新 worktree 后，收到它的执行者必须在实施前依次跑 `mise install`、`mise exec -- pnpm install --frozen-lockfile`、`mise exec -- pnpm run build`，三步都不能省。

`mise install` 排第一，因为工具链版本由 `.mise.toml` 钉住，不同分支可能钉不同版本；它幂等，装过就是一次快速 no-op。

显式运行根 `fix-code` 或 `check-code` 前需要 `node_modules`；完整环境还须构建 workspace 包的 `dist` 类型产物。缺少产物时，`vp check` 会把跨包 import 报成假 `TS2307`，类型感知验证随之不可用。`fix-code` 会修改工作树内容，但不会自动暂存；整理后先检查 diff，再选择要暂存的文件。

## turbo 缓存共享

`.mise.toml` 的 `[env]` 用 `git rev-parse --path-format=absolute --git-common-dir` 把 `TURBO_CACHE_DIR` 锚定到 git common dir（`mono/.git/turbo-cache`），主仓与全部 task worktree 共享同一份本地 turbo 缓存。缓存内容含 `dist` 与 d.ts，跨 checkout 复用安全（turbo 内容寻址），新 worktree 不必冷缓存全量重建。

`pnpm run clean` 的默认档会连这份缓存一起清掉，清后主仓与全部 worktree 都会冷缓存全量重建。在 A worktree 干活的 agent 可能被 B worktree 或主仓的一次 `pnpm run clean` 打中，且无从预知。它不删 `pnpm-lock.yaml`（tracked 文件，属需逐次授权的 lockfile 改动，要显式加 `--locks`）。授权机制见 `workflow.md` 的「怎么取得这个授权」。手动回收直接删 `mono/.git/turbo-cache`，turbo 下次运行自动重建。CI 在 `ci.yml` 显式覆盖回 workspace 内路径，mise 注入不影响 CI 缓存键。

构建或验证前怀疑 `dist` 产物异常（例如被 watch 进程清空 d.ts）时，先跑 `pnpm run agent:env-doctor` 体检，再用 `pnpm run agent:env-doctor --fix`（自动 `turbo build --force`）或手动 `turbo build --force` 重建。

Codex 线程能不能写共享 Turbo 缓存，取决于客户端的权限配置，见 [`environments.md`](environments.md)。

### 缓存可信链

`.agents/checks/turbo-cache-invariant` 要求 `test.dependsOn` 含 `^build`、`build.outputs` 含 `dist/**` 且没有可能排除 `dist` 的负模式，并且 `test.inputs` 不含会显式收进 `dist` 的正模式。不能靠把 `dist/**` 加进 `inputs` 解决缓存问题：`dist` 是 gitignored，`$TURBO_DEFAULT$` 本来不会收它，显式正模式反而让尚无 `dist` 的新 worktree 全部 miss，却不增加产出恢复的正确性。只想回收单个工作区的产物时直接删该工作区的 `.turbo/`。

## Go 缓存探测与共享

`.mise.toml` 的 `[env]` 里 `GOCACHE` 通过 `exec` 模板在 `HERDR_ENV=1` 时运行一段探测：先试 macOS 的默认缓存目录，再试 Linux 的，都不可写才回落到 `$TMPDIR/greypan/go-build`。目的是让各工作区共享同一份 Go 缓存，而不是各自散在临时目录里。

探测命令**永远 exit 0、仅输出一行**，这是 Tera 渲染的要求；`HERDR_ENV` 在场而 `TMPDIR` 为空时条件判假，避免渲染成根路径 `/greypan/go-build`。

没有 `HERDR_ENV` 时模板渲染为空，Go 自行使用平台默认路径——在 macOS 上就是探测会选中的那个目录，所以结果一致，CI 也是如此（`ci.yml` 的 `actions/cache` 读 `go env GOCACHE` 的默认值，不受影响）。**这条链路不挑客户端**：任何 agent 在 mise 激活过的 shell 里都落在同一个缓存上，探测没跑到也只是退回平台默认。

要确认当前拿到的路径，跑 `mise exec -- go env GOCACHE`。

## mise exec 与命令外壳

`.mise.toml` 钉住工具链版本，并在 `[env]` 注入 `TURBO_CACHE_DIR`。这套注入只对 **mise 激活过的 shell** 生效：交互式终端（含终端复用器里的 pane）由 mise 自动激活，agent 的工具宿主、`git hook`、`bash -c` 与外部脚本通常没有。判定要不要加 `mise exec --` 只看一条：**这条命令是否依赖 mise 注入的 env，或 PATH 上被钉住的工具**——经 turbo 的命令两者都依赖，调用 node / pnpm / go 的命令依赖后者；纯粹读写文件、或工具全部由 `node_modules` 提供的命令可以直接跑，拿不准就加。一个例外是 `pnpm run agent:env-doctor`：它存在的意义就是暴露「当前 shell 没激活 mise」，加了前缀会让它用来暴露这件事的两条断言恒报 ok，所以必须裸跑。

一行快速自检，输出非空只说明 env 已被注入（CI 在 `ci.yml` 里覆盖过这个变量也会让它非空），所以它只是提示，权威判据是 `pnpm run agent:env-doctor` 的等值断言：

```sh
echo "${TURBO_CACHE_DIR:-<unset>}"
```

为什么不能靠 turbo 兜底：它的 hash 只记录 `package.json` 里 `engines` 的版本**范围**，不记录真实工具链，所以宿主 PATH 上另一版 node 跑出的构建与钉住版本跑出的构建落在同一个 hash 上。由此有两种各自成立的失效，正是要分开防的两件事——env 没注入时 turbo 落到默认缓存位置，命中不了共享缓存；env 指向共享缓存而 node 不是钉住那一版时，会在同一 hash 下写进工具链不符的产物，之后的命中把它当有效缓存恢复出来。`pnpm run agent:env-doctor` 把这两条事实变成可检测断言：`TURBO_CACHE_DIR` 必须等于共享缓存路径（git common dir 加 `/turbo-cache`），当前 node 必须等于 `[tools]` 钉住的版本，不符即 fail。
