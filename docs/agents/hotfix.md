# Hotfix Playbook

hotfix 是线上紧急修复场景下的操作程序，不是独立的 task 类型。它仍是一个普通 task（`pnpm task new --task hotfix-<slug> --level t0|t1`），只是可以跳过长期 dev lane 直接从生产分支切修复分支。紧急性不是删除证据链的理由：T0/T1 的全部 gate（独立 worktree、冻结 diff、review、approval、验证、done 记录）都保持有效。

## 流程

1. Manager 判定级别（涉及公共契约或跨 workspace 用 T0，否则 T1），创建 task 并从生产基线切修复分支。
2. 实施修复，保持 diff 最小；不顺手重构，不扩大范围。
3. freeze → review → approve（T1 可由 Manager 派 fresh subagent review），验证后 commit。
4. 合并进入集成分支的节奏与 release playbook 一致；changeset 必带（freeze 的 `.agents/checks/changeset-required` 强制）。
5. `pnpm task done` 前完成至少一条 pass 验证并记录交付结论。

## 与普通 task 的差异

- 分支基线是生产状态而不是 dev lane 最新 head。
- review 优先级最高，可以先于其他任务排期；但 reviewer 独立性要求不变。
- 验证范围聚焦回归：修复点 + 受影响契约的聚焦测试，不要求全量浏览器验证，除非修复涉及浏览器运行时行为（此时按 [`browser-verification.md`](browser-verification.md) 的证据档位执行）。
