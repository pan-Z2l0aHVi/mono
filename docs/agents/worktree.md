# Worktree 执行环境与共享缓存

本文件拥有 worktree 准备与执行环境的几件互相关联的事：在一个新 worktree 里把工具链准备好、按需隔离兄弟应用、让各 worktree 共用一份本机 HTTPS 证书、让各 worktree 共享同一份构建缓存，以及在未激活 mise 的 shell 里正确执行命令。它们的共同线索是「拿到一个 worktree 之后怎么正确执行命令」，所以放在一起。

worktree 本身是任务隔离边界，不是包名的别名。包清单、依赖边界与发布边界以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为权威；客户端权限边界见 [`environments.md`](./environments.md)；mise/turbo 的 env 注入由本文承担；提交边界的授权口径见 [`commit.md`](./commit.md)。

## 任务隔离与归属

一个可变 task 对应一个 owner 和一个实施 worktree；怎么创建、放在何处或如何回收，仓库不规定。共享主工作区只用于只读调查与状态查询，合并通过远端 PR 完成，不在共享工作区里做。owner 与 worktree 的唯一性边界见根 [`AGENTS.md`](../../AGENTS.md)。

若本次任务启用了 `task-ledger`，启动时用其 `new` 子命令（`--owner` 与 `--base`）记录归属与起点，并按需在 Task Packet 的 `Worktree` 记录当前工作树路径。

## 新 worktree 的准备

进入新 worktree 后，在实施前按任务需要准备：首次或工具链变化时跑 `mise install`，因为版本由 [`.mise.toml`](../../.mise.toml) 钉住、不同分支可能不同，它幂等；要跑 pnpm、turbo、类型检查、构建或仓库检查时跑 `mise exec -- pnpm install --frozen-lockfile`，显式运行根 `fix-code` / `check-code` 需要 `node_modules`；需要跨包类型检查或消费 `dist` 时跑 `mise exec -- pnpm run build`，缺产物时 `vp check` 会把跨包 import 报成假 `TS2307`。只改文档且不跑这些检查时后两步可省，跳过什么、为什么写进交付说明。

`fix-code` 的改写与暂存边界见 [`commit.md`](./commit.md#pre-commit-与本地-checks)。

## 按需隔离兄弟应用

默认保持**全树检出**：日常视野与任务收窄通过窄口径根 [`.ignore`](../../.ignore)（静音巨量 `apps/*/src/generated/**` 与测试二进制证据）、路径前缀检索（`rg` / `git grep`）以及 `pnpm exec turbo <task> --filter=...` 完成。`packages/` 与全部根级目录永远全量保留、永不稀疏，避免修改公共契约或基础设施时静默漏掉下游消费者。

仅在确需把其他 `apps/*` 从当前工作树物理隔离时，按需调用 [`.agents/skills/apps-sparse-checkout/SKILL.md`](../../.agents/skills/apps-sparse-checkout/SKILL.md)（与 `task-ledger` 完全解耦，不读台账 `scope`；已稀疏态下直接再次调用 `--app` 即可幂等覆盖切换目标 App，从全树开始时可先加 `--dry-run` 预览）：

```sh
mise exec -- node .agents/skills/apps-sparse-checkout/sparse-checkout.mjs --app <dir-name>... [--dry-run]
mise exec -- node .agents/skills/apps-sparse-checkout/sparse-checkout.mjs --restore
```

调用方式、参数契约与稀疏树里的搜索、gate 规则见 [`.agents/skills/apps-sparse-checkout/SKILL.md`](../../.agents/skills/apps-sparse-checkout/SKILL.md)。对这里的环境准备有两条后果：第一，`--app` 收缩/切换与 `--restore` 恢复全树后，脚本都会自动执行一次 `pnpm install --frozen-lockfile` 对齐当前工作区依赖，防止后续 `pnpm run` / `pnpm exec` 触发隐式安装；根目录缺失 `pnpm-workspace.yaml` 或 `pnpm` 不在 PATH 时这一步跳过并告警，需在跑 pnpm 脚本前手动补上。第二，`packages/` 永不稀疏，`check-pre-commit` 在稀疏树上照常运行；被隐藏应用目录内无未跟踪文件时整个目录随 cone 移除，`--restore` 恢复已跟踪文件并同步依赖，若后续需要消费曾被隐藏应用的产物再补跑 `mise exec -- pnpm run build`。

## 本地 HTTPS 证书

文档 demo 的 dev/preview 通过本机 mkcert 证书提供 HTTPS。证书放在用户目录 `~/.config/greypan/dev-certs/`，同一台机器的所有 worktree 共用一份；它不随 checkout 复制，也不入库。上面的 worktree 准备不包含这一步，因为它是每台机器一次的本地信任配置。

首次使用或换机器时运行：

```sh
mkcert -install
mkdir -p ~/.config/greypan/dev-certs
mkcert \
  -cert-file ~/.config/greypan/dev-certs/localhost.pem \
  -key-file ~/.config/greypan/dev-certs/localhost-key.pem \
  localhost 127.0.0.1 ::1
```

`mkcert -install` 会把 mkcert 的本地 CA 加入系统信任库，内嵌浏览器与自定义客户端因此能通过 TLS 校验。证书缺失时 dev/preview 直接失败并打印上述命令；测试档在 CI 没有证书时保持 HTTP，Playwright 自身忽略证书错误。需要换目录时设置 `GREYPAN_DEV_CERT_DIR`；文档 demo 的 `vite.config.ts` 读同一个变量。

## Turbo artifact cache

`TURBO_CACHE_DIR` 指向系统临时目录下的 `<temp>/greypan/turbo-cache/<repo-id>`。[`scripts/lib/turbo-cache-dir.sh`](../../scripts/lib/turbo-cache-dir.sh) 是唯一的路径解析器；所有消费方都必须调用它，不得自行拼路径。它把 Git common directory 解析为物理路径，再用 `git hash-object --stdin` 计算稳定 ID。主仓及其 linked worktree 因共用 Git common directory 而复用同一缓存；独立 clone 有不同的 common directory 和缓存 ID。helper 不创建目录、不写 Git 对象，也不读取继承的 `TURBO_CACHE_DIR`。

Turbo artifact cache 保存可恢复的构建产物，包括 `dist` 与声明文件。新路径首次构建时是冷缓存，系统回收临时目录后 Turbo 会重新构建产物。

`pnpm run clean` 默认清理当前仓库工作区里的构建产物、`node_modules`、`.turbo/`，以及当前 repo-id 的临时 artifact cache；它忽略外部注入的 `TURBO_CACHE_DIR`，不触及其他仓库的缓存。`--dry-run` 只列出当前目标，不删除文件；[`pnpm-lock.yaml`](../../pnpm-lock.yaml) 仍须显式传 `--locks`。`<workspace>/.turbo/` 是工作区内的本地目录，不是共享 artifact cache；删它不会回收外部缓存，也不等同于清理 `dist/`。

CI 在 GitHub Actions 环境下由 [`.mise.toml`](../../.mise.toml) 自动将 `TURBO_CACHE_DIR` 设为工作区下的 `.turbo`（Windows runner 同样不会调用 POSIX helper），用于同一 job 内的本地产物复用；跨 PR 与跨 workflow 的任务产物复用由验证流接入的 Vercel Remote Cache 承担（[`ci.yml`](../../.github/workflows/ci.yml) 的 Turbo 步骤读写、[`wails-verify.yml`](../../.github/workflows/wails-verify.yml) 只读消费；发布与部署流不接入共享 Remote Cache）。本地与不完整的 CI 环境由 helper 计算 canonical 临时路径。

构建或验证前怀疑 `dist` 产物异常（例如被 watch 进程清空 d.ts）时，先裸跑 `pnpm run agent:env-doctor` 体检，再用 `pnpm run agent:env-doctor --fix`（自动 `turbo build --force`）或手动 `turbo build --force` 重建。doctor 按同一公式得到的本地 canonical 路径判断注入；CI workspace override 不会作为它自己的预期值。

Codex 等客户端会话能否写入共享 Turbo cache，取决于客户端的沙箱与权限配置，见 [`environments.md`](./environments.md)。

### 本地接入 Vercel Remote Cache（可选）

[`.gitignore`](../../.gitignore) 已忽略 `.turbo/`，本地通过 `turbo link` 生成的 `.turbo/config.json` 不会误入库。因为 Turbo 哈希只记录 `engines` 范围而不记录真实 `node` 二进制（见下文「mise exec 与命令外壳」），**仅允许在 mise 激活过的 shell（或 `mise exec --`）中启用 Remote Cache**，且默认设为只读远程缓存（`TURBO_CACHE="local:rw,remote:r"`），防止本地异常 `dist` 或非标工具链污染共享缓存。

- 单 worktree：`mise exec -- pnpm exec turbo login && mise exec -- pnpm exec turbo link`。
- 多 worktree（推荐）：在个人 `~/.zshrc` 中导出环境变量（严禁写入仓库文件或 `.mise.toml`）：
  ```sh
  export TURBO_TOKEN="<Vercel PAT>"
  export TURBO_TEAM="<Vercel Hobby Team Slug>"
  export TURBO_CACHE="local:rw,remote:r"
  ```
- 临时完全禁用远程缓存排障使用 `mise exec -- pnpm exec turbo build --cache=local:rw` 或 `TURBO_CACHE=local:rw`（不要使用已废弃且与 `--cache` 冲突的 `--remote-only` / `TURBO_REMOTE_ONLY`）。
- 已知边界：[`apps/interweave/frontend/turbo.json`](../../apps/interweave/frontend/turbo.json) 的 `build.env` 包含 `RUNNER_OS` 以隔离跨 OS 绑定产物；本地终端默认无此变量，因此 `@greypan/interweave-frontend:build` 在本地会稳定 miss 云端缓存并走本机绑定生成，其余上游纯 JS 包正常命中。

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

一行快速自检，输出非空只说明 env 已被注入，所以它只是提示，权威判据是 `pnpm run agent:env-doctor` 的等值断言：

```sh
echo "${TURBO_CACHE_DIR:-<unset>}"
```

让 `mise` 本体可解析和让 shim 生效是两件事：`mise` 本体只在包管理器目录（macOS 上常见 `/opt/homebrew/bin`），钉住的工具链在 `$HOME/.local/share/mise/shims`。为了让 `mise` 可解析而把 `/opt/homebrew/bin` 放到 PATH 最前，会让 Homebrew 的 node 抢在 shim 之前，于是裸跑的 `pnpm` 用的是另一版 node；确实需要两者都在场时，把 shims 放在 Homebrew 之前，或直接用 `mise exec --`。

为什么不能靠 turbo 兜底：它的 hash 只记录 [`package.json`](../../package.json) 里 `engines` 的版本**范围**，不记录真实工具链，所以宿主 PATH 上另一版 node 跑出的构建与钉住版本跑出的构建落在同一个 hash 上。由此有两种各自成立的失效，正是要分开防的两件事——env 没注入时 turbo 落到默认缓存位置，命中不了共享缓存；env 指向共享缓存而 node 不是钉住那一版时，会在同一 hash 下写进工具链不符的产物，之后的命中把它当有效缓存恢复出来。`pnpm run agent:env-doctor` 把这两条事实变成可检测断言：本地 `TURBO_CACHE_DIR` 必须等于路径 helper 计算的 canonical 临时缓存路径，当前 node 必须等于 `[tools]` 钉住的版本，不符即 fail。
