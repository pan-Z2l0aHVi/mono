/**
 * 编排控制的 herdr CLI 实现。
 *
 * 默认实现只在这两个能力真正被装配时才会执行（见 `src/index.ts`）；`createBridge` 本身不
 * 默认起子进程，测试与直接装配方必须显式注入，否则在 `tool_result` 里动到真实 Herdr 会话。
 *
 * herdr 的失败以非零退出码表达，JSON 仍在 stdout 里，所以 `execFile` 抛错时要读
 * `error.stdout` 再解析；否则会把可读的 `zoomed_tab` 降级成一句 spawn 错误。
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { parseAgentList } from '../activation'
import type { HerdrAgentEntry } from '../contracts'

import {
  paneMoveArgs,
  paneZoomOffArgs,
  parsePaneMoveResult,
  parsePaneZoomOffResult,
  type PaneMoveOutcome,
  type PaneZoomClearOutcome
} from './tabs'

const execFileAsync = promisify(execFile)

/** 控制命令的超时。与激活探测同量级：本地 socket 往返，不应该拖住工具调用。 */
const CONTROL_TIMEOUT_MS = 4_000

function herdrBin(): string {
  return process.env.HERDR_BIN_PATH ?? 'herdr'
}

/** `herdr agent list`，供并发闸门统计运行中的 worker。 */
export async function listAgentsViaHerdr(): Promise<ReadonlyArray<HerdrAgentEntry>> {
  const { stdout } = await execFileAsync(herdrBin(), ['agent', 'list'], { timeout: CONTROL_TIMEOUT_MS })
  return parseAgentList(stdout)
}

/** `herdr pane move <pane> --new-tab --label <label> --no-focus`。 */
export async function movePaneViaHerdr(paneId: string, label: string): Promise<PaneMoveOutcome> {
  try {
    const { stdout } = await execFileAsync(herdrBin(), paneMoveArgs(paneId, label), { timeout: CONTROL_TIMEOUT_MS })
    return parsePaneMoveResult(stdout)
  } catch (error) {
    const stdout = (error as { stdout?: unknown } | null)?.stdout
    if (typeof stdout === 'string' && stdout.trim()) return parsePaneMoveResult(stdout)
    const message = error instanceof Error ? error.message : String(error)
    return { moved: false, reason: message }
  }
}

/** `herdr pane zoom <pane> --off`。失败同样读 stdout 里的 JSON 再解析。 */
export async function clearPaneZoomViaHerdr(paneId: string): Promise<PaneZoomClearOutcome> {
  try {
    const { stdout } = await execFileAsync(herdrBin(), paneZoomOffArgs(paneId), { timeout: CONTROL_TIMEOUT_MS })
    return parsePaneZoomOffResult(stdout)
  } catch (error) {
    const stdout = (error as { stdout?: unknown } | null)?.stdout
    if (typeof stdout === 'string' && stdout.trim()) return parsePaneZoomOffResult(stdout)
    const message = error instanceof Error ? error.message : String(error)
    return { cleared: false, reason: message }
  }
}
