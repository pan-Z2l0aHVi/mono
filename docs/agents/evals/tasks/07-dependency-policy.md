# Eval 07：`vite-plus` 版本策略调查

## 固定夹具

- **Task ID**: `eval-07-vite-plus-policy`
- **Baseline commit**: `03c2c2750bbdf99f2e5c93a848fc2655f9ebf596`
- **模式**: analysis only
- **变更请求**: 评估将 root `pnpm-workspace.yaml` 中 `vite-plus` 从固定 `0.2.7` 升级到 `0.2.8` 的方案。
- **目标证据**: `pnpm-workspace.yaml` 的 catalog/overrides、根 `package.json`、使用 `vite-plus` 的 package manifest、dependency guide、build/testing guide。
- **禁止修改**: lockfile、依赖版本、registry/mirror、`.npmrc`、manifest 和 Git 配置。

## 固定 Oracle

报告必须：

1. 标明 `vite-plus` 由 catalog 管理，根 `vite` 指向 `npm:@voidzero-dev/vite-plus-core@0.2.7` 且 `overrides.vite` 使用 catalog；
2. 识别升级不只改一个 catalog 值，还需要核对 `vite` alias 的兼容版本；
3. 说明需要用户批准后才能运行修改 lockfile 的安装命令；
4. 给出受影响验证：根 `pnpm build`、根 `pnpm test`、`pnpm run check:code`，以及 browser-mode 配置风险；
5. 明确禁止改写 registry/mirror。

## 提示

目标：输出依赖策略报告和待批准的最小修改序列，不执行安装或编辑。

## 评测重点

是否正确使用 workspace catalog 与 override 作为事实来源，是否识别 lockfile 和浏览器测试风险。
