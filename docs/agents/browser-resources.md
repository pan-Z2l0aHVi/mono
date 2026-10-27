# 浏览器资源生命周期

任何会启动浏览器进程的任务都适用：真实运行时验证、页面调研、截图、下载、PR 取证，以及通过 MCP、CLI 或桌面自动化间接驱动浏览器的场景。

本文只规定浏览器进程、启动器与专用 profile 的归属和回收。验证选择与运行时取证分别由各自的文档负责，不在这里重复。

## 适用面

- MCP 浏览器服务；
- 跨命令复用同一 daemon 的浏览器 CLI；
- 测试运行器、脚本或桌面自动化直接拉起的浏览器。

不按客户端或产品名维护白名单；按「谁启动、谁持有、谁负责关闭」判断。工具名会变，责任链不会。

## 默认与例外

- 默认使用 headless。只有必须观察窗口、录屏或验证窗口级行为时才使用 headed，并在验证记录中写明原因。headed 会话可能不参与工具的空闲自动关闭。
- 同一任务同一时刻只保留一个仍需要的浏览器实例；多次验证复用同一实例和同一专用 profile。
- 只需要隔离 cookie 与 storage 时，用工具提供的隔离 context，不要另起浏览器进程。
- 不得附加或控制用户的日常浏览器会话。归属判据是本任务独占的专用 profile，不是用了哪个工具。
- 超出上述实例数的浏览器必须有明确原因，并在不再需要它的时点立即回收。
- 测试运行器的并发与 profile 由测试命令管理；下文的单实例、复用与实例计数规则只针对 agent 直接启动的浏览器。测试命令结束后只核验没有残留进程。

## 启动记录

启动前或启动时记录：

- 本任务 worktree 的物理路径；
- 启动器 / MCP 服务的 PID 与 CWD；
- 浏览器主进程 PID 与 PPID；
- 专用 profile 的完整路径。

工具不返回这些信息时，趁父子链仍可观察，用系统进程表补记。不要只记服务 PID：浏览器可能在服务退出后继续运行。也不要用应用名、profile 前缀、CPU 使用率或运行时长推断归属。

## 关闭顺序

关闭页面或 tab 不等于关闭浏览器。按工具能力选择：

1. 工具提供浏览器级 close / quit（命令名以工具为准，例如某些 CLI 的 `close --all`）：优先调用，并确认进程退出。
2. 工具没有浏览器级关闭，但服务会在 stdin 结束或终止信号时清理自己启动的浏览器：先让服务优雅退出，由服务关闭浏览器。只结束浏览器 PID 时，服务可能在下一次调用时重新拉起。
3. 服务被客户端长期持有：只停止本任务启动、且经「归属核验」唯一确认的服务；共享服务保持运行，只按归属链结束本任务的浏览器。若共享服务会重新拉起浏览器，记录为未完成，不要猜测停止共享服务。客户端仍在运行，不等于浏览器还要继续运行。
4. 测试运行器管理的浏览器由测试命令负责，不按本节单独查杀。

回收顺序：

1. 关闭本次验证打开且不再复用的页面；
2. 结束浏览器主进程，或让启动器代为结束；
3. 用专用 profile 的完整路径做全进程扫描，确认没有进程仍在使用；不要只检查主 PID；
4. 若进程仍在，发送 `TERM`；等待 10 秒，重新做第 3 步；只有进程仍在且 PID、完整 profile 再次确认匹配时，才发送 `KILL`；
5. 记录每一步的结果。

## 归属核验

从本任务 worktree 定位唯一的启动器 / MCP 服务，再逐级核对到浏览器主进程。共享父进程、浏览器 CWD 或 PID 与 profile 自洽，都不足以单独建立归属。

以下命令以 Chromium 系为例；其他引擎用等价的 profile 参数。

```sh
worktree="$(cd "$(git rev-parse --show-toplevel)" && pwd -P)"
launcher_pid="本任务 worktree 对应的唯一启动器 / MCP 服务 PID"
browser_pid="本任务记录的浏览器主进程 PID"
ps -ww -axo pid=,ppid=,command=
lsof -a -p "$launcher_pid" -d cwd -Fn
ps -ww -p "$browser_pid" -o pid=,ppid=,command=
```

`lsof` 的 `n` 路径必须与 `$worktree` 相同，且候选服务唯一。命令行必须包含本任务记录的完整 `--user-data-dir`。

确认专用 profile 是否仍被任何进程使用时，按完整路径做边界匹配，避免前缀误伤（例如 `/tmp/p` 与 `/tmp/p2`）：

```sh
browser_profile="本任务记录的完整 profile 路径"
ps -ww -axo pid=,command= | VERIFY_BROWSER_PROFILE="$browser_profile" awk '
{
  argument = "--user-data-dir=" ENVIRON["VERIFY_BROWSER_PROFILE"]
  position = index($0, argument)
  if (position == 0) next
  before = position == 1 ? "" : substr($0, position - 1, 1)
  after = substr($0, position + length(argument), 1)
  if ((before == "" || before ~ /[[:space:]]/ || before == sprintf("%c", 34) || before == sprintf("%c", 39)) &&
      (after == "" || after ~ /[[:space:]]/ || after == sprintf("%c", 34) || after == sprintf("%c", 39))) print
}'
```

有输出表示 profile 仍被进程使用。任一环节无法确认时，不要猜测或做破坏性清理；按 [`workflow.md`](./workflow.md#怎么取得这个授权) 取得授权并确认目标，或把清理列为未完成。

## Profile 与磁盘

- 工具若声明会在正常关闭时删除临时 / isolated profile，仍以进程与 profile 核验为准；崩溃、强制结束或客户端异常退出可能留下目录。
- 只删除本任务在启动记录中写明的专用 profile，且位于系统临时目录或工具文档声明的临时 / isolated 路径。
- 工具默认 profile、命名持久 `--profile` 路径、用户日常浏览器数据和其他任务的 profile 一律只报告，不删除。确需删除不属于本任务的 profile 时，按 [`workflow.md`](./workflow.md#怎么取得这个授权) 取得逐次授权。
- 删除前用上面的 profile 查询确认没有进程使用；不要按目录年龄或前缀匹配删除。
- 定期清理是异常退出的兜底，不替代正常关闭。

## 报告

任务记录或验证记录必须写明：启动过的实例总数与峰值并发、每个实例的 profile、浏览器 PID / PPID、关闭方式，以及退出后的核验结果。测试运行器管理的浏览器只记录命令与残留核验结果，不按实例计数。没有启动浏览器时写「不适用」。未完成的回收要写成未完成，不能用工具调用成功、页面关闭或 CI 通过代替。
