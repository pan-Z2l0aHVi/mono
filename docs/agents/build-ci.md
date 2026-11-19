# CI 门控与 workflow 拓扑

本文件承接 [`build.md`](./build.md) 的 CI 切面：门控由谁定义、workflow 拓扑以什么为权威、PR 上的两道自动门与发布链的接线。PR review 的判据只在 [`review.md`](./review.md) 定义；授权机制只在 [`workflow.md`](./workflow.md#怎么取得这个授权) 定义。

## 门控归属

Codex 审查门与自动修的边界由 [`review.md`](./review.md) 与 [ADR-0021](../adr/0021-codex-review-gate.md) 承载；autofix 上限与计数口径见 [`.github/codex/README.md`](../../.github/codex/README.md) 的指针，本文不复述。

workflow 的真实触发面、`permissions`、job `needs` / `if`、step `id`、构建矩阵与安装面以 YAML 本身为权威。[`.github/scripts/lib/workflow-topology.mjs`](../../.github/scripts/lib/workflow-topology.mjs) 只声明跨 workflow 的少量不变量（发布分支、required context 与 policy step），同目录的 [`workflow-topology.test.mjs`](../../.github/scripts/lib/workflow-topology.test.mjs) 读取真实 YAML 逐项比对，包括各 Wails workflow 的原生构建矩阵必须一致，并通过 `test-scripts` 与 CI 的 `check` 强制执行。改 workflow 或该声明而不同步，`check` 会失败；不要在本文件复制这些细节。

workflow/job 的 `timeout-minutes` 以及构建和脚本中的超时、重试上限按 [workflow.md#预授权操作](./workflow.md#预授权操作) 取得授权。

## 执行面

CI 的 Test 步用 `turbo test --concurrency=2` 限制任务并发：runner 核数少于本地时，turbo 默认并发会让多个包的浏览器与 Go 测试互相抢 CPU，表现为随机的等待预算耗尽。本地 `pnpm run test` 保持 turbo 默认并发，不承担这项限制。

CI 构建 workspace 包并跳过 Interweave app wrapper；Wails verify / release 在原生 runner 上构建 frontend 依赖闭包并打包应用。workflow 的 path filter 由 frontend package manifests 的传递依赖图校验。npm 发布通过 Trusted Publishing 绑定 workflow 文件路径，重命名 [`npm-publish.yml`](../../.github/workflows/npm-publish.yml) 需同步更新 npm 注册。

CI 的 check 仍需在 mise 安装前准备 Wails Linux 开发包：mise 从 Go 源码编译 pinned wails3，CI 会核验 CLI，并在 interweave-frontend 构建时生成 bindings，因此这些系统依赖也服务于构建链。apt 归档缓存由 check 之前的独立 job 预热：它的超时高于 required check，required check 等待该 job 且自身超时更短，具体分钟数见 [`ci.yml`](../../.github/workflows/ci.yml)。main push 只运行预热 job，不运行完整 check；成功写入的默认分支 cache 可供后续 PR 读取，PR 写入的缓存只供该 PR 复用。只有完整下载或安装成功才写缓存；缓存未命中时仍从配置的软件源下载，缓存只是优化、不是构建前提；冷缓存 job 失败时 check 仍会继续并报告自身结果。

[`deploy-pages.yml`](../../.github/workflows/deploy-pages.yml) 只发布 `DEMO_APPS` 列出的 demo 应用到 `/mono/<name>/`，不遍历全部 `apps/<name>`，也没有根落地页。History 路由的深层链接依赖 404 回退：应用必须在创建路由器之前恢复 `redirect`，未知路径保持 404。

## 合并与发布授权

合并门控只放行 required checks 通过的 PR；具体 context 集合与 strict 策略属于远端规则集状态，以仓库当前规则为准。`GITHUB_TOKEN` 创建的版本 PR 可能需要人工批准挂起的 run；不归属到具体用户的改动需要额外 approval，且 PR 作者不能批准自己的改动。此 access-control approval 不等于 review 结论，review 规则见 [`review.md`](./review.md)；挂起与发布恢复的操作细节见 [`release.md`](./release.md)。

未经用户授权不执行发布，取得授权的机制见 [`workflow.md`](./workflow.md#怎么取得这个授权)；发布命令、首次发布工具与重跑纪律见 [`release.md`](./release.md)。Git 检查的绕过禁令见 [`commit.md`](./commit.md)。

## PR changeset gate 与标题检查

PR changeset gate 的判据、豁免与本地边界见 [`release.md`](./release.md#changesets)；它由 CI 对 PR base/head 执行，required check 覆盖 CI 与仓库硬约束，不等于 PR review。

[`ci.yml`](../../.github/workflows/ci.yml) 对 PR 的标题与代码变更事件运行（具体事件集合以该文件为准）；PR 标题检查位于依赖安装之前，并用 PR base 提交中的 [`commitlint.config.js`](../../commitlint.config.js) 规则检查标题，避免提案分支替换现行语言规则。标题先从事件负载读取；fork PR 负载不含完整 PR 对象时，用仅有 `pull-requests: read` 权限的 `GITHUB_TOKEN` 通过 `gh api` 读取标题与 base SHA。API token 只提供给读取步骤，标题检查脚本本身不接收 token。修改 PR 标题属于远端写操作，须按 [`workflow.md`](./workflow.md#怎么取得这个授权) 取得授权。标题被编辑时会触发完整 CI 重跑；若标题保持中文，required check 会失败。其他 PR 元数据编辑也会触发完整重跑。
