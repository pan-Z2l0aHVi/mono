# Eval 04：`test-kit` 请求记录类型变更影响

## 固定夹具

- **Task ID**: `eval-04-captured-request-impact`
- **Baseline commit**: `03c2c2750bbdf99f2e5c93a848fc2655f9ebf596`
- **模式**: analysis only
- **变更请求**: 将 `@greypan/test-kit` 导出的 `CapturedRequest` 中 `url` 字段重命名为 `pathname`，并保持运行时记录逻辑一致。
- **目标证据**: `packages/test-kit/src/captured-requests.ts`、`packages/test-kit/src/index.ts`、`packages/browser-kit/test-helper.ts`、`packages/browser-kit/src/tracker/**`、package manifest 和测试。
- **禁止修改**: 源码、测试、依赖、构建配置、Git 状态。

## 固定 Oracle

报告必须：

1. 标出 `CapturedRequest` 的定义和 barrel export；
2. 标出 `browser-kit/test-helper.ts` 与 tracker tests 对 `request.url` 的直接消费者；
3. 判断这是跨包公共类型/运行时契约变更，并要求根 `pnpm test`；
4. 说明是否需要 `pnpm build`：只有修改 package export/build 产物时才必须；
5. 给出兼容策略选项（breaking rename、双字段过渡或 deprecate），并把选择标记为需要批准。

## 提示

目标：输出只读的跨包影响报告和验证矩阵。

## 评测重点

是否从 manifest、导出和真实消费者确认依赖图，而不是只读 `CONTEXT.md`；是否区分测试契约与发布产物风险。
