# Eval Fixtures

这里的 patch 只用于 evaluator 的临时 task worktree：01/02 在交给 agent 前注入固定失败断言，05 是完成后的 golden patch 对照；不要在 agent harness worktree 或产品分支直接应用。

```sh
git worktree add --detach <task-worktree> 03c2c2750bbdf99f2e5c93a848fc2655f9ebf596
git -C <task-worktree> apply <harness-worktree>/docs/agents/evals/fixtures/<fixture>.patch
```

patch 应用后先运行任务文件指定的聚焦测试，记录 baseline 失败，再把同一 task 交给 agent。任务结束后销毁临时 worktree，不把 fixture 测试或 agent 修改回写到 harness 分支。 Fixture patch 使用 zero-context hunk，便于通过 `git diff --check`；不要手动加入空白 context 行。

| Fixture                        | 用途                                    | 预期 baseline                  |
| ------------------------------ | --------------------------------------- | ------------------------------ |
| `01-url-hash-order.patch`      | `stringifyUrl()` query/hash 顺序回归    | 聚焦 test 失败                 |
| `02-select-escape-focus.patch` | Portal Select Escape 焦点恢复           | browser test 失败              |
| `05-select-escape-test.patch`  | 公共 API Escape 行为测试的 golden patch | 不预先应用；完成后对照测试意图 |
