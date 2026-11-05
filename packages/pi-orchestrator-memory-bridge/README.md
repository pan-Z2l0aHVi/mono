# pi-orchestrator-memory-bridge

> 在 Herdr 的 Pi lead 会话中记录编排决策，并把任务板摘要注入系统提示。

这是私有 Pi 扩展，只服务 Herdr 中运行的 Pi lead 会话。

## 作用

- 把 `herdr_plan` 的获批结果和 `herdr_review` 的拒绝原因写入 `@pedro_klein/pi-memory`。
- 提供 `orchestration_memory_recall`，让 lead 读回上一轮的获批计划与被拒原因。
- 把 `pi-task-board` 的任务摘要注入 system prompt 的独立段。
- 只在 lead 会话激活。worker 和 reviewer pane 不加载任何内容。

记忆里只保存决策要点和拒绝原因，不保存 worker 终端输出、代码 diff 或文件内容。

## 前置条件

- Pi 1.4.0 或更高版本，Herdr 0.7.5 或更高版本。
- 已执行 `herdr integration install pi`。
- 已安装记忆后端、编排层与任务板：

```sh
pi install npm:@pedro_klein/pi-memory
pi install npm:@ret2hell/pi-herdr-orchestrator
pi install npm:pi-task-board
```

## 安装

`package.json` 已经声明扩展入口。下面两种注册方式只能选一种。同时使用会让钩子执行两次。

方式 A，把包目录链接到 Pi 的扩展目录：

```sh
ln -s "$PWD/packages/pi-orchestrator-memory-bridge" ~/.pi/agent/extensions/pi-orchestrator-memory-bridge
```

方式 B，在 `~/.pi/agent/settings.json` 的 `extensions` 数组里写包目录的绝对路径。

不要同时在全局 `packages` 数组里再加一条本包。

## 使用

编排模式需要手动开启。没有开启时，lead 会直接改代码，不会调用 `herdr_plan` 或 `herdr_dispatch`。

```text
/shepherd          切换
/shepherd on       进入协调者模式
/shepherd off      退出
```

开启后，`edit` 和 `write` 会从可用工具中移除，同时注入一段协调者指令。退出、`/reload` 或 dispose 时恢复。

典型流程：

```text
1. 在 Herdr 的 pane 里启动 pi
2. /shepherd
3. 让 lead 处理一个 issue
4. lead 调用 orchestration_memory_recall，然后 herdr_plan，等你批准
5. lead 调用 herdr_dispatch 启动 worker，再用 herdr_watch 等待
6. lead 调用 herdr_review 启动 reviewer，等你确认结论
7. lead 汇总结果，/board 查看任务状态
```

协调者模式允许调研、计划、派发、等待、审查、记忆读写、任务板和用户提问。`bash` 会被保留，因为协调者需要只读检查。`bash` 也能写文件，这一点只靠指令约束。

## 配置

并发上限和独立 tab 写在 orchestrator 的 `config.json` 中：

```json
{
  "shepherd": {
    "maxConcurrentWorkers": 4,
    "separateTabs": true
  }
}
```

- `maxConcurrentWorkers` 限制正在运行的 worker 数量，默认 4。达到上限后 `herdr_dispatch` 会被拒绝，并提示等待或调高上限。reviewer 不占 worker 名额。
- `separateTabs` 为 `true` 时，新建的 worker 和 reviewer 会被移到独立 tab。默认开启。如果源 tab 处于 zoom，桥接会先取消 zoom 再重试一次。它不会移动 lead 自己的 pane。

## 记忆

编排记忆保存在 `pi-memory` 中，并在同一仓库的所有 worktree 之间共享。

记忆不会自动注入。lead 必须在 `herdr_plan` 之前调用 `orchestration_memory_recall`。

## 任务板

`pi-task-board` 的任务保存在当前会话目录的 `.pi/task-board.json`。桥接会让主 checkout 和所有 worktree 共用仓库外的一块任务板：

```text
~/.pi/task-boards/<repo-key>/
```

仓库目录里不保存看板数据。迁移已有任务板时，同 id 条目以共享目录为准，且不保留备份。

因为 `.pi` 是目录链接，项目级 Pi 配置不能再放在 `.pi/settings.json`。

## 限制

- `bash` 没有被移除，协调者模式仍有写文件的能力。
- 每个决策锚点会多一次模型调用。写入持续失败时，该锚点会被丢弃并提示原因。
- worker 只在 ledger 中写入 `DONE:` 或 `BLOCKED:` 时才算完成。只在对话里给出结论会让 `herdr_watch` 等到超时。
- 任务板读取依赖 `pi-task-board` 的 `version: 2` 文件格式。格式升级后摘要会退化为不显示。
- 共享任务板依赖文件系统支持目录链接。不支持链接或 `.pi` 已包含其他内容时不会共享，只提示原因。
- `--tools -edit` 或 `--tools -write` 的显式排除可能被 resume 修复覆盖。需要排除时改用 `--exclude-tools` 或 allowlist 形式。
- worker 可以用 `bash` 绕过 `task_board` 工具直接改任务板文件。桥接没有检测这种改动。

## 验证

```sh
# 1. 在 Herdr pane 内启动 Pi
printf '%s %s %s\n' "$HERDR_ENV" "$HERDR_SOCKET_PATH" "$HERDR_PANE_ID"

# 2. 注册扩展后执行 /reload，确认没有报错
ln -s "$PWD" ~/.pi/agent/extensions/pi-orchestrator-memory-bridge

# 3. 执行 herdr_plan 并批准，再 dispatch 一个 worker
# 4. 让 reviewer 返回 REJECT，确认 /orchestration-memory 中出现待写入记录
# 5. 保存完成后，用 memory_search scope=current 查找 orchestration.<repo-key>.rejection.*
# 6. 用 /board 查看任务状态
# 7. 退出 lead 后在同一仓库目录重启，system prompt 应包含 orchestration 段
# 8. 在 worker pane 中重复检查，不应出现桥接输出
```
