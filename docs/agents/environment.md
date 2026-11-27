# Worktree、运行环境与依赖边界

## 新 Worktree 准备与稀疏隔离

- **初始化**：进入新 worktree 后按需依次运行 `mise install`、`mise exec -- pnpm install --frozen-lockfile`、`mise exec -- pnpm run build`（缺上游 `dist` 时 `vp check` 会把跨包 import 报成假 `TS2307`）。仅改文档且不跑代码检查时可省后两步。
- **默认全树**：靠根 [`.ignore`](../../.ignore)、路径前缀检索与 `turbo --filter` 收窄视野；`packages/` 与根级目录永不稀疏。确需物理隔离兄弟 `apps/*` 时按需调用 [`.agents/skills/apps-sparse-checkout/SKILL.md`](../../.agents/skills/apps-sparse-checkout/SKILL.md)。

## mise exec、缓存与排障

- **何时包 `mise exec --`**：在未激活 mise 的 shell（agent 工具宿主、git hook、`bash -c`）中，凡依赖 mise 注入 env（`TURBO_CACHE_DIR`）或被钉工具（node/pnpm/go/wails3）的命令都须加 `mise exec --`。**唯一例外是 `pnpm run agent:env-doctor` 必须裸跑**，否则会掩盖“当前 shell 未激活 mise”的告警。
- **共享缓存与排障**：`scripts/lib/go-cache-dir.sh` 由 `.mise.toml` Tera 模板求值，必须永远 exit 0 且单行输出。怀疑 `dist` 损坏先裸跑 `pnpm run agent:env-doctor`，修复用 `pnpm run agent:env-doctor --fix`；`pnpm run clean` 清理构建产物与临时缓存，删 `pnpm-lock.yaml` 须显式传 `--locks`。
- **本地可选 Vercel Remote Cache**：因 Turbo hash 不记录真实 node 二进制，**仅允许在 mise 激活环境启用**，且默认设为只读远程缓存（`TURBO_CACHE="local:rw,remote:r"`），凭据放在个人 `~/.zshrc`，严禁写入仓库文件。本地缺少 `RUNNER_OS` 时 `@greypan/interweave-frontend:build` 稳定 miss 云端缓存属预期行为。

## 本地 HTTPS 证书

文档 demo 的 dev/preview 经 `devHttpsPlugin()` 读取 `~/.config/greypan/dev-certs/`（本机多 worktree 共用，不入库；可用 `GREYPAN_DEV_CERT_DIR` 覆盖）。首次在本机运行：

```sh
mkcert -install && mkdir -p ~/.config/greypan/dev-certs
mkcert -cert-file ~/.config/greypan/dev-certs/localhost.pem -key-file ~/.config/greypan/dev-certs/localhost-key.pem localhost 127.0.0.1 ::1
```

## 客户端权限边界

[`.codex/config.toml`](../../.codex/config.toml) 与 [`.claude/settings.json`](../../.claude/settings.json) 为仓库级配置；实际权限以当前会话工具返回为准，**沙箱放行不等于用户授权**。改动客户端共享配置须遵守 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进)。

## 依赖放置与 pnpm 策略

- 变更依赖或 pnpm 策略须按 [`workflow.md`](./workflow.md#授权边界与-pr-自动跟进) 取得用户授权。
- **放置位置**：共享工具链/构建插件/测试基建放根 `devDependencies`；框架专属测试与类型工具放所属包 `devDependencies`；运行时依赖放所属包 `dependencies`；消费者提供的依赖同时放 `peerDependencies` 与 `devDependencies`（可选 peer 标 `peerDependenciesMeta.optional: true`）。
- **版本与配置**：统一用 `catalog:` 管理版本；跨发布流依赖（如 Wails Go 与 npm runtime）锁定到经验证的同一版本；pnpm 依赖策略统一写在 [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml)，`.npmrc` 只放 auth 与 registry，应用级 `.npmrc` 无效。
