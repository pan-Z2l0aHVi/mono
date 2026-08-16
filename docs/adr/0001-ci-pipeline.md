# ADR-0001: CI 流水线

## 背景

该 monorepo 需要一条 CI 流水线，在合并前捕获回归问题，并在发布时自动发布软件包。

## 决策

- **CI**（`.github/workflows/ci.yml`）：changeset 状态检查 → 完整构建 → Web 格式、lint、类型检查与 Go 静态检查 → 测试；提交 hook 在提交前自动修复暂存文件的格式问题
- **创建版本 PR**（`.github/workflows/changeset-version.yml`）：仅使用 `changesets/action@v1` 创建版本 PR。它会对私有 Wails 工作区进行版本管理，但不会将其发布到 npm。
- **发布 npm 软件包**（`.github/workflows/npm-publish.yml`）：合并版本 PR 后，通过 npm Trusted Publishing 重新构建并发布公开软件包。
- **验证 Wails 桌面端**（`.github/workflows/wails-verify.yml`）：原生 macOS/Windows 构建用于验证桌面端 Pull Request，并支持只读权限的手动运行。
- **发布 Wails 桌面端**（`.github/workflows/wails-release.yml`）：合并版本 PR 后，重新构建两个安装程序并创建 Wails GitHub Release。
- Demo 应用被排除在版本管理之外（它们是私有的）

## 后果

- CI 在测试之前统一运行 `check:code`（Vite Plus Web 格式/lint/类型检查与根 `check:go` 调用的 Interweave `go vet`）；提交 hook 的 `vp staged` 自动修复暂存文件，Go 格式未作为独立 CI 门禁
- npm 发布和桌面端 GitHub Release 在版本 PR 合并后是独立的、并行的发布平面
- `changeset` 工作流要求使用约定式提交消息
