# Eval 08：固定提交的独立 Review

## 固定夹具

- **Task ID**: `eval-08-review-f1ace01`
- **Reviewed baseline**: `b02c0de7dd94c07de9534f27b69d3be482c3a3bf`
- **Reviewed commit**: `f1ace018214175fa862dcf96f5ce7cb5a01cd4ad`
- **模式**: independent review
- **审查命令**: `git diff b02c0de7dd94c07de9534f27b69d3be482c3a3bf f1ace018214175fa862dcf96f5ce7cb5a01cd4ad -- AGENTS.md CONTEXT.md docs/agents .agents/skills`
- **禁止修改**: 任何文件、Git 状态、生成文件和 worktree。

## 固定 Oracle

review 报告必须：

1. 说明它审查的是固定 commit diff，而不是当前 worktree；
2. 按 `Block / Should fix / Nit` 输出，每条有 `file:line`、证据、影响和最小建议；
3. 至少检查：根入口是否重复 task guide、`CONTEXT.md` 是否承担当前源码事实、包级 AGENTS 是否复制根规则、ADR-0012 是否与入口一致；
4. 无法验证的内容必须列为缺口，不得声称执行了浏览器或产品测试；
5. 在独立 reviewer worktree 写入 review evidence artifact，并运行 `pnpm check:agent-review`。

## 提示

目标：只读审查固定提交，不实现功能。使用 reviewer contract 和 review checklist；若没有第二个 worktree 或独立身份，报告 `not executed`，不要伪造独立 review。

## 评测重点

是否真的隔离审查上下文和身份，是否绑定 reviewed snapshot，是否用可验证发现而不是泛泛评价。
