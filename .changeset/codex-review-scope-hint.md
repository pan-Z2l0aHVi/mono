---
---

CI 修复，不涉及发包：自动审查在改动较大时会给模型一份可读的入口。`review-scope.json` 此前只在 prompt 里被提到名字、没给路径，模型只能猜（实测猜成 `$RUNNER_TEMP/review-scope.json`，拿到空结果）；现在写明它在 `$RUNNER_TEMP/codex-review/review-scope.json`，并点出 `changed_paths` 是本次 diff 改动过的文件清单。同时说明单条命令的输出会被截断，要求按 `changed_paths` 逐个文件 `git diff <merge-base> <head> -- <path>`，再读工作树补上下文——PR #519 的第二次审查正是在「Diff huge 578k」这一步收尾的。评论侧同步改口径：`unreviewed` 的结论已作废，覆盖清单不构成审查范围，不再输出「检查 0 个文件，无未覆盖项」这种与「未审查」相反的表述，也不渲染「未覆盖」段落；`reviewed` 与 `stale` 的覆盖行不变。提示词里的路径与 `scopePath()` 的输出由单测绑定，结论目录一挪就会红。
