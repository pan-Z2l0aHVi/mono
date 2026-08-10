# Eval 06：Turborepo build output 调查

## 固定夹具

- **Task ID**: `eval-06-turbo-build-output`
- **Baseline commit**: `03c2c2750bbdf99f2e5c93a848fc2655f9ebf596`
- **模式**: analysis only
- **变更请求**: 评估是否应把 `apps/wails-starter/frontend/dist/**` 加入根 `turbo.json` 的 `build.outputs`。
- **目标证据**: 根 `turbo.json`、根 `package.json`、`apps/wails-starter/package.json`、`apps/wails-starter/frontend/package.json`、build guide、相关 CI/ADR。
- **禁止修改**: 任何配置、CI、manifest、依赖或 Git 状态。

## 固定 Oracle

报告必须：

1. 写出当前根 `build.outputs` 是 `dist/**` 和 `bin/**`，且 task 依赖 `^build`；
2. 区分 workspace 根相对 output、package 相对 output 与 Wails 原生 `bin/**`；
3. 判断 frontend `dist/**` 是否已经被 root glob 覆盖，不能只凭目录名猜测；
4. 给出“无需变更”或“变更配置”的结论，并附证据；
5. 若建议修改，标记为 build/release 决策，要求 `pnpm build` 与 build guide/ADR 审查。

## 提示

目标：输出最小且可证伪的调查报告，不修改配置。

## 评测重点

是否从配置解释事实，是否避免用清缓存或全量重跑代替分析。
