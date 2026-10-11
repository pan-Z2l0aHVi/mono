# 根命令面

本文件是根 `package.json` 命令面的权威来源，覆盖命名约定、受众划分、全量索引，以及每条命令的用途与引用位置。短约束层见 [`.agents/rules/commands.md`](../../.agents/rules/commands.md)。查询工具（`agent:find-usages` 等）的语义与参数不在这里，以 [`context.md`](context.md) 为准；本文件只回答有哪些命令、叫什么、谁用，以及为什么这么叫。

## 命名约定

```text
{namespace}:{do}-{something}
```

- 动宾之间用 `-` 连接；没有宾语时省略（`ci:measure`，不是 `ci:measure-something`）。
- namespace 取值闭集：`agent` / `ci` / `dev`。无 namespace 合法，基础命令属于这一类。

### namespace 按拥有方划分

前缀表达这条命令失效时谁先受影响，与它什么时候被调用、有多重要无关。

| namespace | 拥有方        | 判定                                                                   |
| --------- | ------------- | ---------------------------------------------------------------------- |
| `agent`   | agent 自己    | 改动后先打断 agent 自己的工作流：task 生命周期、影响面查询、浏览器取证 |
| `ci`      | CI 与仓库自检 | 改动后先让流水线变红或让自检失真：context 校验、脚本测试、CI 成本台账  |
| `dev`     | 本地开发      | 改动后先影响开发者起服务                                               |

`agent:*` 与 `ci:*` 的分界最容易含糊：一条命令被 CI 跑，不代表它归 `ci`。判定顺序是先问「谁先失效」定归属，再按归属决定要不要加前缀。

- `fix-code`：先失效的是 agent 自己的流程（它被 task `freeze` 归一化调用），归属是 `agent`，所以有 `agent:` 的邻居却不带 `ci:` 前缀。
- `check-code`：先受影响的既不是 agent 也不是 CI，而是本地任何一条改动路径，归属中立，于是连 namespace 都不进，归入无前缀的基础命令。

### 机检

| 守卫                                   | 判定什么                                        | 执行端                    |
| -------------------------------------- | ----------------------------------------------- | ------------------------- |
| `scripts/command-conventions.test.mjs` | 根 script 名的形状与 namespace 闭集，含反例断言 | `ci:test-scripts`（glob） |
| `ci:validate-context`                  | 文档里写到的根命令在 `package.json` 里真的存在  | `ci:validate-context`     |

命令名的改动与文档引用的同步必须在同一变更里完成，否则这两条守卫会在提交前拦下。

## 全量索引

「引用位置」列出该命令名在指令面与 CI 中被写到的地方；没有引用的命令表示它只在 `package.json` 声明。

### `agent:` — agent 自己的工作流

| 命令                     | 用途                                                                                       | 引用位置                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `agent:task`             | task 生命周期：new/assign/start/freeze/review/approve/verify/done/drop/status/issue/guard  | 根 `AGENTS.md`、`workflow.md`、`build.md`、`commit.md`、`release.md`、`linting.md`、`.vite-hooks/pre-commit`                       |
| `agent:find-usages`      | 按路径推导受影响 workspace、最小 context 与最小充分验证                                    | 根 `AGENTS.md`、`context.md`、`build.md`、`test-execution.md`、`workflow.md`、两个包级 `AGENTS.md`、`contract-change-review` skill |
| `agent:inspect-contract` | 输出可发布 package 的 exports、直接消费者与最小验证                                        | 根 `AGENTS.md`、`context.md`、`build.md`、`workflow.md`、`packages/web-ui/AGENTS.md`、`contract-change-review` skill               |
| `agent:diff-contract`    | 输出 manifest-level semver 审阅候选（`--base <git-ref>`）                                  | 根 `AGENTS.md`、`context.md`、`build.md`、`workflow.md`、`contract-change-review` skill                                            |
| `agent:verify`           | 引擎级浏览器取证：check-env / touch-flow / interpolate                                     | `browser-verification.md`、`test-execution.md`                                                                                     |
| `agent:env-doctor`       | 体检 worktree 环境（dist 截断、watch 污染、缓存、残留）                                    | `build.md`                                                                                                                         |
| `agent:update-skills`    | 经官方 `skills update` 引擎更新第三方 skill 并收割回真实家（临时目录隔离，不破坏软链布局） | `linting.md`、`skills/README.md`                                                                                                   |

`agent:verify` 目标页连不上时报错会带可行动提示：它的默认 URL 指向本地 devserver，所以「连不上」最可能的解释是服务没起，而不是地址写错。

### `ci:` — CI 与仓库自检

| 命令                  | 用途                                                         | 引用位置                                               |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| `ci:validate-context` | 校验 context 路由、断链、软链、出处、命令引用与必存在 script | `build.md`、`workflow.md`、`.github/workflows/ci.yml`  |
| `ci:test-scripts`     | 以 glob 跑全部 `scripts/*.test.mjs`                          | `build.md`、`workflow.md`、`.github/workflows/ci.yml`  |
| `ci:measure`          | 只读统计 CI 成本（需 `gh` 登录）                             | `build.md`                                             |
| `ci:flakes`           | 汇总 flake 榜（读 `ci-test-output-*`）                       | `build.md`、`.github/scripts/record-test-failures.mjs` |

`scripts/` 的测试约定是每个脚本一个 `<name>.test.mjs`，由 `ci:test-scripts` 按 glob 执行，新增文件不用注册；决策背景见 [ADR-0014](../adr/0014-task-system-v2.md)。

### 基础命令（无 namespace）

| 命令               | 用途                                                                                        | 引用位置                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `build` / `test`   | 经 Turbo 编排全仓构建与测试                                                                 | 根 `AGENTS.md`、`build.md`、全部 workflow                                                                         |
| `check-code`       | 全仓代码质量检查（聚合项见 [`linting.md`](linting.md)）                                     | `linting.md`、`build.md`、`commit.md`、`context.md`、`workflow.md`、`ARCHITECTURE.md`、`.github/workflows/ci.yml` |
| `fix-code`         | 上述检查的一键修复（聚合项见 [`linting.md`](linting.md)）                                   | `linting.md`、`build.md`、`workflow.md`、task `freeze` 归一化                                                     |
| `check-cspell`     | 拼写检查                                                                                    | `linting.md`、`workflow.md`、`context.md`                                                                         |
| `check-go`         | `gofmt -l` 断言 + 逐 `go.mod` 跑 `go vet`                                                   | `linting.md`                                                                                                      |
| `check-stylelint`  | CSS lint                                                                                    | `linting.md`                                                                                                      |
| `fix-go`           | `gofmt -w` + 同一批 `go vet`                                                                | `linting.md`                                                                                                      |
| `fix-stylelint`    | stylelint 自动修复                                                                          | `linting.md`                                                                                                      |
| `check-pack`       | 用 `pnpm pack --dry-run` 验证发布文件与 export targets                                      | `build.md`、`context.md`、`contract-change-review` skill、`.github/workflows/ci.yml`                              |
| `release-version`  | 版本同步（Changesets 版本 PR 与包版本同步）                                                 | `build.md`、`linting.md`、`workflow.md`、`.github/workflows/changeset-version.yml`                                |
| `publish-new-pack` | 首次发布新包                                                                                | `build.md`                                                                                                        |
| `clean`            | 默认全量清理：构建产物、`node_modules`、缓存（含共享 turbo cache）；`--locks` 为显式 opt-in | `build.md`                                                                                                        |
| `commit`           | `git-cz` 交互式提交                                                                         | `commit.md`                                                                                                       |
| `prepare`          | `vp config`，设置 hooks 路径                                                                | 由 `pnpm install` 自动触发                                                                                        |

`dev:react-web-ui-demo`、`dev:vue-web-ui-demo`、`dev:interweave` 三条归入 `dev` namespace，作用面见 [`build.md`](build.md)「Demo 开发」。`check-pack` 与生成物生命周期以 [`build.md`](build.md) 为准；本表只索引命令名与引用位置。
