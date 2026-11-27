# CI 门控与缓存边界

workflow 的真实触发面、权限、job 拓扑与矩阵以 `.github/workflows/*.yml` 为权威；[`.github/scripts/lib/workflow-topology.mjs`](../../.github/scripts/lib/workflow-topology.mjs) 及其测试断言跨 workflow 不变量（含 Wails 原生构建矩阵一致），改 workflow 须同步通过 `test-scripts`。

## 执行与并发

- CI 的 Test 步用 `turbo test --concurrency=2` 避免 runner CPU 争抢导致等待超时；本地 `pnpm run test` 保持默认并发。
- CI 构建 workspace 包并跳过 Interweave app wrapper；Wails verify/release 在原生 runner 构建 frontend 闭包并打包。

## 缓存单写多读与 Remote Cache 边界

- **GitHub Actions 缓存采用单写多读**：[`setup-deps`](../../.github/actions/setup-deps/action.yml) 默认 `cache-save: 'false'`（只读恢复），仅 [`ci.yml`](../../.github/workflows/ci.yml) 的预热 job 在 `main` 路径匹配 push、4 天 `schedule` 或 `workflow_dispatch`（`warm_only: true`）时写三端共享基线；其余 PR、验证与发布 workflow 只读消费，不写 PR 私有大副本。
- **Vercel Remote Cache 仅限非发布验证流**：`ci.yml` 的 Turbo 步骤读写、`wails-verify.yml` 只读消费（凭据仅注入 step 级 `env`，fork PR 自动降级）；`wails-release.yml`、`npm-publish.yml` 与 `deploy-pages.yml` 不接入未签名共享 Remote Cache，始终从源码干净构建。
- **冷缓存超时处置**：基线过期时先在 `main` 触发 `workflow_dispatch`（`warm_only: true`）预热再重跑 PR；大依赖或 `.mise.toml` 升级优先拆独立小 PR 合入 `main` 预热，不盲目拉大 `timeout-minutes`。

## Pages、npm 与 PR 门控

- [`deploy-pages.yml`](../../.github/workflows/deploy-pages.yml) 仅发布 `DEMO_APPS` 列表到 `/mono/<name>/`，History 路由深层链接依赖 404 回退，应用须在建路由器前恢复 `redirect`。
- [`npm-publish.yml`](../../.github/workflows/npm-publish.yml) 通过 npm Trusted Publishing 绑定 workflow 文件路径，重命名须同步更新 npm 侧注册。
- PR 标题检查位于依赖安装前，使用 **PR base** 的 [`commitlint.config.js`](../../commitlint.config.js) 校验（避免分支篡改语言规则）；编辑 PR 标题或元数据会触发完整 CI 重跑，修改 PR 标题或合并/发布操作须遵守 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进)。
- Codex 自动审查与自动修判据见 [`review.md`](./review.md)、[ADR-0021](../adr/0021-codex-review-gate.md) 与 [`.github/codex/README.md`](../../.github/codex/README.md)。
