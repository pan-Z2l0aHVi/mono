# 根命令面

本文件是根 `package.json` 命令面的权威来源：命令名、用途与 namespace 归属。短约束见 `.agents/rules/commands.md`；工具参数与契约查询接口见 docs/agents/agent-context.md。

## 命名约定

```text
{namespace}:{do}-{something}
```

- 动宾之间用 `-` 连接；没有宾语时省略（`clean`，不是 `clean-something`）。
- 分组 CLI 以管理对象命名，动作由子命令提供（如 `agent:task-ledger status`）；单动作 CLI 仍使用动宾结构。
- namespace 取值闭集：`agent` / `ci` / `dev`。无 namespace 合法，基础命令属于这一类。

### namespace 按拥有方划分

前缀表达这条命令失效时谁先受影响，与它什么时候被调用、有多重要无关。

| namespace | 拥有方        | 判定                                                      |
| --------- | ------------- | --------------------------------------------------------- |
| `agent`   | agent 自己    | 改动后先打断 agent 自己的工作流：本地任务登记、环境体检   |
| `ci`      | CI 与仓库自检 | 改动后先让流水线变红或让自检失真：策略、context、脚本测试 |
| `dev`     | 本地开发      | 改动后先影响开发者起服务                                  |

`agent:*` 与 `ci:*` 的分界看命令失效后谁先受影响，而不是谁调用它。`agent:task-ledger` 管理本地登记；`ci:check-policies` 检查仓库规则。`fix-code` 是作用于整个工作树的显式整理命令，不依赖 task 状态或 CI，因此归入无 namespace 的基础命令；`check-code` 同样检查任意本地改动路径，也保持无 namespace。

## 机检

| 守卫                                   | 判定什么                                               | 执行端                                                          |
| -------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `.agents/checks/command-conventions`   | 根 script 名的形状与 namespace 闭集，含反例断言        | `ci:check-policies`、pre-commit hook 与 CI required policy step |
| `ci:validate-context`                  | 文档引用的根命令存在，context 路由、链接和必需入口完整 | 手动自检与 CI                                                   |
| `.github/scripts/ci-topology.test.mjs` | 真实 workflow 是否符合拓扑表                           | 根 `ci:test-scripts`，再由 CI `check` job 执行                  |

命令名和文档引用的改动须在同一变更里完成，否则机检会失败。

## 全量索引

下表列出根 `package.json` 声明的全部命令与用途。

### `agent:` — agent 自己的工作流

| 命令                  | 用途                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `agent:task-ledger`   | 本地 task 登记、归属、进度与引用；不运行检查、整理或构建                                   |
| `agent:task`          | 旧 CLI 的临时迁移 adapter；正式命令见 `agent:task-ledger`                                  |
| `agent:env-doctor`    | 体检 worktree 环境（dist 截断、watch 污染、缓存、残留）                                    |
| `agent:update-skills` | 经官方 `skills update` 引擎更新第三方 skill 并收割回真实家（临时目录隔离，不破坏软链布局） |

影响面与契约查询由 contract-change-review skill 的内置脚本提供，不属于根命令面。

### `ci:` — CI 与仓库自检

| 命令                  | 用途                                                         |
| --------------------- | ------------------------------------------------------------ |
| `ci:validate-context` | 校验 context 路由、断链、软链、出处、命令引用与必存在 script |
| `ci:test-scripts`     | 经 `git ls-files` 跑全仓 `*.test.mjs`（tracked-only）        |
| `ci:check-policies`   | 从当前 Git worktree 执行五项只读仓库政策检查并输出 JSON      |

`ci:validate-context` 是修改 `AGENTS.md`、rules、skills 或 `docs/agents/**` 时必须通过的检查。真实 CI 拓扑由 `.github/scripts/ci-topology.test.mjs` 解析 workflow 并比对 `.github/scripts/ci-topology.mjs`，由 `ci:test-scripts` 执行。脚本测试（`*.test.mjs`）与被测脚本同址，由 tracked-only glob 执行；新增而未跟踪的测试需在本地显式运行。`.agents/checks/` 下的无扩展名文件是仓库政策检查，由 `ci:check-policies` 和 pre-commit 执行。包行为测试位于 `__tests__/*.spec.ts`，经 `pnpm test` 运行 turbo `test` 任务。

### 基础命令（无 namespace）

| 命令               | 用途                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `build` / `test`   | 经 Turbo 编排全仓构建与测试                                                                 |
| `check-code`       | 全仓代码质量检查（聚合项见根 `package.json`）                                               |
| `fix-code`         | 全工作树代码检查与整理的显式修复命令；不会自动暂存文件                                      |
| `check-cspell`     | 拼写检查                                                                                    |
| `check-go`         | `gofmt -l` 断言 + 逐 `go.mod` 跑 `go vet`                                                   |
| `check-stylelint`  | CSS lint                                                                                    |
| `fix-go`           | `gofmt -w` + 同一批 `go vet`                                                                |
| `fix-stylelint`    | stylelint 自动修复                                                                          |
| `check-pack`       | 用 `pnpm pack --dry-run` 验证发布文件与 export targets                                      |
| `publish-new-pack` | 首次发布新包                                                                                |
| `clean`            | 默认全量清理：构建产物、`node_modules`、缓存（含共享 turbo cache）；`--locks` 为显式 opt-in |
| `commit`           | `git-cz` 交互式提交                                                                         |
| `prepare`          | `vp config`，设置 hooks 路径                                                                |

`dev:react-web-ui-demo`、`dev:vue-web-ui-demo`、`dev:interweave` 三条归入 `dev` namespace，作用面见 `build.md`。`check-pack` 与生成物生命周期以 `build.md` 为准；本表只列命令名与用途。
