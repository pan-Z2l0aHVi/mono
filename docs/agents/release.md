# 发布流程

本文件覆盖仓库侧的发布操作：开 PR 并通过 CI 与 approval、合并后验证，以及有版本变更时的发布链验证。

交付单元是 task：一条 task 一个 worktree、一条分支、一个 PR，通常直接合进 `main`。task 很大、拆成多条子任务且需要一起验证时，可以把各开发分支合到一个中间集成分支，再对这条分支开 PR。

## Changesets

Changesets 同时管理 npm 包、私有 app 与桌面端 release 驱动版本。按改动位置选择声明：

| 改动位置                                                                                                        | 是否发布                                                                                            | Changeset 写法                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/*`                                                                                                    | 发布到 npm                                                                                          | 声明发生行为变更的对应包，选择 `patch`、`minor` 或 `major`。                                                                                                                                           |
| `apps/interweave`（不含下行单独说明的 `frontend`）                                                              | 不发布到 npm；版本号驱动桌面端 release                                                              | 声明 `'@greypan/interweave'`，选择 `patch`、`minor` 或 `major`。版本变化会触发 Wails release 工作流。                                                                                                  |
| `apps/interweave/frontend`                                                                                      | 不发布到 npm；`@greypan/interweave-frontend` 在 `.changeset/config.json` 的 `ignore` 表中，版本固定 | 对 app 行为或产物有可感知影响的产品代码、配置或构建变更，声明 `'@greypan/interweave'`，选择 `patch`、`minor` 或 `major`。只有测试与测试助手的改动写空壳。永远不要声明 `@greypan/interweave-frontend`。 |
| `apps/react-web-ui-demo`（`@greypan/react-web-ui-demo`）与 `apps/vue-web-ui-demo`（`@greypan/vue-web-ui-demo`） | 不发布到 npm；两个包都在 `ignore` 表中                                                              | 一律写空壳，不声明这两个被忽略的包。                                                                                                                                                                   |

表中未列出的非包路径（仓库根目录、`.github/`、`docs/`、`scripts/`、`.agents/` 等）上的纯 test/docs/chore 改动按下段写空壳。

不要声明 `.changeset/config.json` 的 `ignore` 表中的包。被忽略的声明不会 bump 版本，也不会被版本 PR 删除；`has-changesets` 不会把它算作待处理 changeset，所以文件会永久滞留，只能手动删除。私有包不打 npm 发布标签（`privatePackages.tag` 禁用）；桌面端二进制的发布标签由 Wails 工作流在两个原生构建都成功后创建。

changeset 描述统一用英文，它会写进公共包 CHANGELOG，面向 npm 上的外部读者。纯 test/docs/chore 等不影响包版本的变更创建空 changeset：只含两行 `---` 的 `.changeset/<kebab-name>.md`，frontmatter 不写包与版本号，版本 PR 原样消费它而不产生版本变更；空 changeset 没有包可归属，文件名不带包名前缀属于正常情况。

`changeset-required` 政策检查逐个核对带入 PR 的每条 changeset，要求它以成对 `---` 开头、分隔线前没有散落内容，声明了包的还必须带正文，并拒绝声明 `ignore` 表里的包。读不到有效的 `ignore` 表时检查会 fail-closed。任何一条畸形、空描述或被忽略的包声明都会在冻结与提交边界拦住。

## 步骤

1. 确认 task 的 gate 已满足（T0 与 T1 都是 `approved`），记录 task id、base SHA、diff hash 与 changeset。
2. 跑影响范围内的测试、构建、契约与必要的浏览器验证，记入 task state。
3. 开 PR（base = `main`），等 CI 与用户 approval；合并本身要用户明确授权。取得授权的机制（弹窗、推荐项与自定义输入）见 `workflow.md` 的「怎么取得这个授权」。
4. 合并后验证 `main` CI；有版本变更时，再验证 changesets 版本 PR、批准、合并与 npm 发布链。
5. 两段验证都通过后关闭 task；验证未完成不得清理证据。

CI 的机械性格式与拼写修复可由该 PR 对应 task 的 owner 处理；逻辑、测试和契约问题回到原 task owner。任何变更都会让该 PR 之前冻结的证据失效，需要重新 freeze/review/approve。
