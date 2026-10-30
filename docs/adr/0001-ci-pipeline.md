# ADR-0001: CI 验证流程

- **Date**: 2026-07-21
- **Status**: 已接受

## 背景

Monorepo 需要在合并前验证 workspace，并对发布流程使用独立权限。

## 决策

PR CI 检查标题、changeset、仓库政策、构建、代码质量和测试。Wails 的原生构建另由对应 workflow 验证。workflow 的触发条件、执行顺序和实际构建范围以 `.github/workflows/` 为准。

pre-commit 运行只读政策检查；作者显式执行格式修复并检查暂存内容。提交检查不改写文件，避免检查阶段改变待提交的内容。PR review 与 CI 分别提供独立审查和自动检查，不能相互替代。

## 后果

- CI 可在合并前发现构建、测试和仓库政策问题，但绿色 CI 不证明 review 完成。
- npm 与 Wails 的发布使用独立 workflow；发布决策见 [ADR-0003](./0003-release-planes.md)。
