# ADR-0022: 发布流程随编排层移交后的形态

- **Date**: 2026-10-04
- **Status**: 已作废（2026-10-06），保留作历史记录
- **Relates to**: [ADR-0021](0021-orchestration-layer-moved-to-herdr-projects.md)（拆分与派发权的移交）、[ADR-0001](0001-ci-pipeline.md)（CI 触发面）、[ADR-0003](0003-release-planes.md)（发布平面）

## 作废说明（2026-10-06）

本文记录的是「多条 task 聚到一条发布通道分支、再由该分支开一个 PR 进 `main`」的形态，该形态已作废。现行形态以 herdr-projects 自身的 skill 为唯一权威：**交付单元是任务**——一条 task 一个 worktree、一条分支、一个 PR，直接合进默认分支 `main`，中间没有发布通道这一层。

以下正文只作历史记录保留，不构成指引；今天照做的是 [`docs/agents/release.md`](../agents/release.md)，仓库与编排层的边界见 [ADR-0021](0021-orchestration-layer-moved-to-herdr-projects.md)。逐条现状：

- §1「发布通道由编排层拥有」随通道一起作废；同节「仓库只保留集成验证与合并后验证」仍然成立，已由 `release.md` 承接。
- §2 的结论（不给 `ci.yml` 扩展 `branches:`）仍然成立，但**理由换了**：`branches: [main]` 对「每条 task 的 PR 都指向 `main`」的形态恰好覆盖，每条 PR 都拿得到 `check`。原文的成本论证（同一份树被验证 N 次）只作一条事实保留，不再支撑任何决定。
- §3 前半「发布通道内保留每条 task 的独立 commit」随通道一起作废；后半「PR → `main` 保持 squash」仍然成立。
- §4 作废：没有集成 PR，也就没有它整体定级的问题；各 task 按自身影响面定级。
- 「为什么不为流程形态变更单开一篇 ADR 之前先问」一节只解释本文当初为何单开，不再是现行依据。

## 背景

[ADR-0021](0021-orchestration-layer-moved-to-herdr-projects.md) 把需求拆分与 task 派发移交给 herdr-projects 后，`docs/agents/release.md` 里有一批句子描述的是一个已经没有人执行的层：release worktree 由「编排层」创建、已批准 task 由「聚合 task 的 owner」以 `git merge` 聚合、冲突由 **Manager** 解决——`Manager` 这个角色连同整个自研编排层已在 `6d7e1694` 删除。这些句子留着一个悬空引用，而 ADR-0021 §「行为变化」里写的「`release.md` 的 Manager 角色表述改为聚合 task 的 owner」本身也指向一个已被移除的形态。

删掉这些句子不难，难的是确定删完之后**剩下的那半流程长什么样**。这不是文档措辞问题：编排层的实际做法与仓库原定的发布形态并不一致，而这个差异此前没有任何文档承载。三条事实决定了新形态：

1. **CI 只在 base 为 `main` 的 PR 上运行。** `.github/workflows/ci.yml` 的触发面是 `pull_request` 且 `branches: [main]`（同时由 `.github/scripts/ci-topology.mjs` 单一声明、`scripts/ci-topology.test.mjs` 逐字段比对）。指向任何其它分支的 PR 拿不到 `check`。
2. **编排层把每条 task 落在发布通道分支上**，由「发布通道 → main」的一个 PR 承担集成与合并门控。实证：t-0001 的 thread record 里 `base = "release/260925"`，其 PR #193 的 base 是 `release/260925`；实际拿到 `CI` 与 `Verify Wails Desktop` 两个 `pull_request` 运行的是同一个 head SHA 上的 PR #194（base=`main`）。同 SHA 上的两个 PR 只触发触发面匹配的那一个——这正是事实 1 的直接后果。
3. **`main` 是 squash-only，且 ruleset 开了 strict required status。** `ci.yml` 不监听 push 与这一条互为前提，见其文件头注释与 `ci-topology.mjs`。

## 决策

### 1. 发布通道由编排层拥有，仓库只保留集成验证与合并后验证

`release.md` 保留 changeset 逐个校验、集成验证、开 PR 等 CI 与 approval、合并后验证 `main`、以及有版本变更时的版本 PR 与 npm 发布链验证。删除的只有编排职责：worktree 创建、已批准 task 的聚合方式与冲突解决、branch/worktree 的删除命令（改由 `thread resolve` 回收）。

保留的步骤没有被削弱：`changeset-required` 仍然逐个核对每一份声明而不是「整批至少有一个」，集成验证与合并后验证仍然是两段。

### 2. 不给 `ci.yml` 扩展 `branches:` 列表

一个显然的替代方案是让每条 task 各自开 base→main 的 PR，CI 逐 PR 跑，这样每次集成都有一份独立证据，编排层的 `pr-followup` 例行规则（`on = "pr"`、`events = ["checks-failed", "review"]`）也有持续的输入而不必依赖某一次发布 PR。

否掉的理由：**同一份树会被验证 N 次，而发布通道那一次已经是最终判据。** 本仓 CI 一次跑完整的 build + test + check-code + check-pack + Playwright，成本不是常数；`ci:measure` 的口径也说明 `main` 上 `push` 那一次因为 squash 落在新 SHA 上、树却与验过的 PR head 相同，所以「省掉一次重复验证」的收益本来就读不出来——把它换成 N-1 次重复触发则读得出来，且是净增。`main` 的 ruleset 只要求 `check` 一个上下文，发布通道那一次满足它就够了。

代价要写明：编排层把某条 task 的 base 放在非 `main` 分支上时，那条 task 的 PR 在合并进发布通道之前没有 CI 证据。集成验证发生在发布通道 PR 上，不是每条 task 上。这是本决策接受的形态，不是待修的缺口——若日后要每 task 一份 CI 证据，改 `ci.yml` 的 `branches:` 加 `ci-topology.mjs` 那一行即可，届时应重新评估成本。

### 3. 发布通道内保留 commit，通道 → main 保持 squash

发布通道内每条 task 保留独立 commit（merge commit 或 `--no-ff`），**不 squash**。squash 把 N 条 task 压成一条，task 边界在 git 历史里消失：之后既不能整笔回滚某条 task，也不能单独 bisect 到它，而 task 体系的全部证据链正是按「一条 task 一个可定位的 diff」建立的（冻结 `diffHash`、整笔回滚、独立 review 对象）。task id、reviewer、approver 都挂在这条边界上。

通道 → main 仍然 squash。这是仓库既定策略，不是本 playbook 的选择范围：`ci.yml` 不监听 push 与 ruleset 的 strict required status 都建立在「PR head 的树等于合并后 main 的树」上，改掉要同时重做这两处，代价与收益不成比例。

代价也要写明：main 上是一条 commit，message 按 GitHub 的形状拼接各 task 的 message（main 上既有 `Release/260925 (#194)` 这样的记录可查）。所以 **message 级追溯保留，commit 级追溯不保留**——需要在 git 历史里定位到单条 task 的人，应在发布通道分支上查，不在 `main` 上查。

### 4. 不再把集成 PR 整体按 T0 建

原句「聚合 task 按 T0 建」依赖已删除的 T0 判据「聚合发布或多 worktree 并行」（ADR-0021 §2 已删除该项，理由是该判据描述编排形态而非影响半径）。新形态下这条 PR 没有单一的级别：它包含 N 条各自定级的 task。

改为：各 task 按自身影响面定级；其中**至少一条为 T0** 时，这条集成 PR 才按 T0 的 gate 走。这与 ADR-0021 §2 留下的「聚合发布仍然按 T0 建 task——但依据是它聚合的 task 里至少有一条 T0」一致，把那条已经写明的原则接回 playbook，而不是重新引入一条编排形态判据。

## 为什么不为流程形态变更单开一篇 ADR 之前先问

`CONTEXT.md` 的 ADR 索引规则要求表内只列仍承载现行决策的 ADR，`scripts/validate-context.mjs` 只断言每篇编号 ADR 有入站链接（不断言逐条索引）。本文记录的正是现行决策——发布通道归属、CI 触发面与合并方式三项都会改变后续读者的动作，而 ADR-0021 只记录了权责移交、没有记录移交之后的形态。两者不是同一件事，所以单开。

## 行为变化

- `docs/agents/release.md`：删除编排层职责与 `Manager` 悬空引用；保留 changeset 逐个校验、集成验证、PR/approval、合并后验证、发布链验证；新增「CI 只在 base 为 main 的 PR 上运行」一节说明形态成因；合并方式改为发布通道内保留 commit、通道 → main squash，并写明两者的理由与代价；worktree 删除改为 `thread resolve`。
- `docs/agents/workflow.md`「Playbook」一条重写：不再说「聚合已批准 task」与「聚合 task 按 T0 建」，改为按 ADR-0022 的形态与级别规则。「失败和恢复」一条把「聚合 task 的 owner」改为「该 PR 对应 task 的 owner」。
- `CONTEXT.md`：ADR 索引表增加本篇。
- **未改动**：`.github/workflows/ci.yml` 与 `.github/scripts/ci-topology.mjs`（决策 2 就是不改它们）；`docs/agents/build.md`、`linting.md`、`commands.md` 里的「聚合」指的是聚合命令的组合，与编排层无关。
- **ADR 本身不改**：`docs/adr/0014-task-system-v2.md` L44 关于「release 聚合 diff 对 base 天然包含被聚合 task 的 changeset」是历史记录，`.agents/checks/changeset-required` 的注释里同一句作为现行检查的说明保留——那句在新的形态下依然成立（发布通道 PR 的 diff 相对 `main` 天然包含各 task 的 changeset），不需要注记。
