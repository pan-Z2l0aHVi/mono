# ADR-0025: PR 阶段的独立审查与本地提交门禁

- **Date**: 2026-10-18
- **Status**: 已接受
- **Amends**: [ADR-0014](0014-task-system-v2.md) 与 [ADR-0024](0024-task-tiering-v3.md) 的 task 状态、review、approval、验证和提交 gate
- **Relates to**: [ADR-0018](0018-task-state-in-tmpdir.md)（临时目录中的本地 task 台账）、[ADR-0021](0021-orchestration-layer-moved-to-herdr-projects.md)（worktree 与编排边界）
- **Amended by**: 2026-10-19 —— 退役 `ci:check-policies` 包装入口；pre-commit 与 PR CI 直接执行 `.agents/checks/` 下的同一组只读检查，检查集合与失败语义不变

## 背景与取舍

本地 hook 对能修改仓库的执行体只能防止遗漏检查，不能证明独立 review 已完成。若把 review/approval 前置到 commit，会阻断小步提交。把风险控制移到完整 PR diff 的独立 review 和逐次授权的 squash merge，允许先提交再审查，同时保留合并前的人工判断。仓库由单人维护时，PR 作者不能用同一账号批准自己的 PR；GitHub 登录身份也不是本地 reviewer 执行独立性的判据。若未来需要机器可执行的独立审查门禁，应另行评估 required check、结果解析和运行者。这个判断是后续决策背景，不代表本次已上线自动 reviewer。

## 决策

本地登记由 task-ledger skill 负责，只记录归属、进度、issue 与 PR 引用；状态为 `open`、`active`、`closed`、`dropped`，不记录 review、approval、验证阶段或 diff hash。`agent:task` 临时 adapter 已删除；`guard`、`freeze`、`review`、`approve`、`verify` 已移除。整理由实施者显式运行 `fix-code`，检查改动后只暂存预期文件。（2026-10-19 注记：分级与记账已提取为通用 task-ledger skill，schema 降为 v1、命令收为 `new/start/status/ref/close/drop`，见 ADR-0028（纯文本）；本 ADR 的 review/approval/验证 gate 退役决策不变。）

仓库政策检查由 `.agents/checks/` 下的五项固定只读检查组成，不读取 task 台账；pre-commit 在提交时依次执行这组检查。PR CI 的 policy step 直接执行其中四项，`format-clean` 由 `check-code` 覆盖；PR changeset 政策仍由 CI 使用 PR base/head commit 比较，release 主分支豁免由 workflow 表达。登记、检查和整理入口彼此独立，不把检查结果写回 task 状态。

T0/T1 在 PR 阶段由独立的本地 reviewer 检查实际源码、完整差异与验证证据，并将结果和覆盖的 base/head SHA 写入 PR 或持久交付记录。实施者自查、task 台账和 CI 不能替代 review。required check 执行 CI 和仓库硬约束，不等于 review；远端规则集当前要求哪些 context、是否要求 approving review 属于平台状态，以仓库当前规则为准。review 发表及 merge 仍按会话中的授权边界逐次执行。

`pull_request` workflow 默认验证 GitHub 生成的 base/head 合并对象；strict required status 要求 PR 分支保持最新 base。Squash 会创建新的提交，因此不据此宣称合并 commit 或 tree 与此前测试对象恒等。按需复检 main CI 使用 `workflow_dispatch`，不改变当前事件拓扑。

本次不接入无人值守 PR reviewer、Codex Action、API secret 或远端 ruleset。required check 是否适合作为未来自动审查门禁，待有可验证的运行者、结果关联和失效处理方案后另行决策；本决策没有把未来机制列为当前交付。

## 后果

Task state schema v3 以 `open`、`active`、`closed` 和 `dropped` 表达本地登记；旧 v1/v2 读取时只作内存投影，针对记录的定向写入才迁移并保留历史 events。（2026-10-19 注记：schema 已随 task-ledger skill 收敛为 v1，不再保留旧版本迁移；见 ADR-0028（纯文本）。）task 登记不触发检查，也不改写工作区或 Git index；本地政策检查可独立运行并 fail closed。PR CI 包含 changeset policy 与四项仓库政策检查；review 报告独立保存并关联具体提交，新的 head 或 base 需要重新确认其覆盖范围。
