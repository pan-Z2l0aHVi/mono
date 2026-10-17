# 根命令面

本文件是根 `package.json` 命令面的权威来源：有哪些命令、叫什么、谁用，以及为什么这么叫。短约束层见 `.agents/rules/commands.md`，影响面与契约查询已收归 contract-change-review skill（内置脚本），语义与参数见 `agent-context.md` 的工具接口，都不在这里。

## 命名约定

```text
{namespace}:{do}-{something}
```

- 动宾之间用 `-` 连接；没有宾语时省略（`clean`，不是 `clean-something`）。
- namespace 取值闭集：`agent` / `ci` / `dev`。无 namespace 合法，基础命令属于这一类。

### namespace 按拥有方划分

前缀表达这条命令失效时谁先受影响，与它什么时候被调用、有多重要无关。

| namespace | 拥有方        | 判定                                                       |
| --------- | ------------- | ---------------------------------------------------------- |
| `agent`   | agent 自己    | 改动后先打断 agent 自己的工作流：task 生命周期、影响面查询 |
| `ci`      | CI 与仓库自检 | 改动后先让流水线变红或让自检失真：context 校验、脚本测试   |
| `dev`     | 本地开发      | 改动后先影响开发者起服务                                   |

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

下表列出根 `package.json` 声明的全部命令与用途。

### `agent:` — agent 自己的工作流

| 命令                  | 用途                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `agent:task`          | task 生命周期：new/assign/start/freeze/review/approve/verify/done/drop/status/issue/guard  |
| `agent:env-doctor`    | 体检 worktree 环境（dist 截断、watch 污染、缓存、残留）                                    |
| `agent:update-skills` | 经官方 `skills update` 引擎更新第三方 skill 并收割回真实家（临时目录隔离，不破坏软链布局） |

影响面查询（受影响 workspace、最小 context 与最小充分验证）与契约查询（exports、直接消费者、Git 基线 semver 候选）都不在根命令面：调用 contract-change-review skill，由其 self-contained 内置脚本提供；语义与参数见 agent-context.md 的工具接口。

### `ci:` — CI 与仓库自检

| 命令                  | 用途                                                         |
| --------------------- | ------------------------------------------------------------ |
| `ci:validate-context` | 校验 context 路由、断链、软链、出处、命令引用与必存在 script |
| `ci:test-scripts`     | 以 glob 跑全部 `scripts/*.test.mjs`                          |

`ci:validate-context` 是改动 `AGENTS.md`、rules、skills 或 `docs/agents/**` 时必须通过的守卫。`scripts/` 的测试约定是每个脚本一个 `<name>.test.mjs`，由 `ci:test-scripts` 按 glob 执行，新增文件不用注册，它也是 CI 拓扑表的执行端；决策背景见 [ADR-0014](../adr/0014-task-system-v2.md)。

### 基础命令（无 namespace）

| 命令               | 用途                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `build` / `test`   | 经 Turbo 编排全仓构建与测试                                                                 |
| `check-code`       | 全仓代码质量检查（聚合项见根 `package.json`）                                               |
| `fix-code`         | 上述检查的一键修复（聚合项见根 `package.json`）                                             |
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

`dev:react-web-ui-demo`、`dev:vue-web-ui-demo`、`dev:interweave` 三条归入 `dev` namespace，作用面见 [`build.md`](build.md#demo-开发)。`check-pack` 与生成物生命周期以 [`build.md`](build.md) 为准；本表只列命令名与用途。
