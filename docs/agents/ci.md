# CI 门控与缓存边界

workflow 的触发面、权限、job 拓扑与矩阵直接以 `.github/workflows/*.yml` 为准；本文只记无法从配置直接推导的约束。

- **跨 workflow 拓扑门禁**：[`.github/scripts/lib/workflow-topology.mjs`](../../.github/scripts/lib/workflow-topology.mjs) 及其测试断言跨 workflow 不变量（含 Wails 原生构建矩阵一致），改 workflow 须同步通过 `test-scripts`。
- **CI 测试并发上限**：`ci.yml` 的 `turbo test --concurrency=2` 用于避免 runner CPU 争抢导致等待超时，勿轻易调高。
- **GitHub Actions 缓存单写多读**：仅 `ci.yml` 预热 job 写共享缓存基线，其余 PR、验证与发布 workflow 保持只读，不写 PR 私有大副本。冷缓存超时时先在 `main` 触发 `workflow_dispatch`（`warm_only: true`）预热，或将大依赖 / `.mise.toml` 升级拆独立小 PR 合入 `main` 预热，不盲目拉大 `timeout-minutes`。
- **发布流禁用未签名 Remote Cache**：`wails-release.yml`、`npm-publish.yml` 与 `deploy-pages.yml` 不得接入共享 Vercel Remote Cache，始终从源码干净构建。
- **Pages 深层链接契约**：Pages demo 的 History 路由深层链接依赖 404 回退，应用须在建路由器前恢复 `redirect`。
- **npm Trusted Publishing 路径绑定**：[`npm-publish.yml`](../../.github/workflows/npm-publish.yml) 与 npm 侧 Trusted Publishing 绑定了 workflow 文件路径，重命名须同步更新 npm 侧注册。
- **PR 元数据重跑成本**：编辑 PR 标题或元数据会触发完整 CI 重跑；修改 PR 标题或合并/发布操作须遵守 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进)。Codex 审查判据见 [`review.md`](./review.md)、[ADR-0021](../adr/0021-codex-review-gate.md) 与 [`.github/codex/README.md`](../../.github/codex/README.md)。
