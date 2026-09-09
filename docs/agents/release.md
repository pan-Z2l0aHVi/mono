# Release 循环

Release worktree 只负责聚合和发布，不承担长期实施。它必须从最新 `origin/main` 创建，且同一时间只允许一个未完成的 release cycle。

1. Manager 或 integrator 确认所有待聚合 task 已 `approved`，记录各自 task id、base SHA、diff hash 和 changeset。
2. 在仓库旁创建唯一 release worktree，安装依赖并初始化 release 状态；实施 task 不直接写入 release worktree。
3. 以 `git merge` 或等价的受控集成方式聚合已批准 task；冲突由 integrator 在 release worktree 解决，并记录决策。
4. 聚合后把 release diff 作为新的 review 对象；原 task 的 review 不自动覆盖聚合冲突解决或额外修改。
5. 确认至少一个正确归属的 changeset，运行影响范围内测试、构建、契约和必要的浏览器验证，记录到 release task state。
6. 创建 PR，等待 CI 和用户 approval；合并方式按仓库策略执行，默认 squash。
7. 合并后验证 main CI；有版本变更时再验证 changesets version PR、批准、合并和 npm 发布链。
8. 两段验证通过后关闭 task、删除 release branch/worktree，并关闭由本轮创建的 Herdr workspace；未完成验证不得清理证据。

CI 的机械性格式和拼写修复可以由 integrator 处理；逻辑、测试和契约问题回到原 task owner 修复。任何 release diff 变化都必须重新 freeze/review/approve。
