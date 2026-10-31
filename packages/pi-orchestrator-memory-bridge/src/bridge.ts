/**
 * 桥接扩展的装配层。
 *
 * 这个模块不含 I/O 细节，只把钩子接到纯函数上，并固定「何时读、何时写、写哪里」的时序：
 *
 * - `session_start`：解析仓库身份（同一仓库的所有 worktree 共享一个 key）。
 * - `before_agent_start`：只把 board 摘要渲染进 `sections.orchestration`。编排记忆**不自动注入**
 *   ——钩子拿不到 `executeTool`，查不了 `pi-memory`；要读过 `orchestration_memory_recall`。
 * - `tool_result`：识别 `herdr_plan` / `herdr_review` 的锚点，压入 pending 队列；同时把
 *   dispatch / watch / review 事件映射成任务板动作，压进同一个队列。
 * - `agent_before_settle`：有 pending 时追加一轮指令，让模型调用保存工具。
 * - 保存 / 召回工具的 `execute()`：唯一拿得到 `executeTool` 的地方，负责落 pi-memory 与任务板。
 *
 * 激活门槛不成立时 `createBridge` 立即返回，不注册任何钩子与工具——worker pane 里必须无痕。
 */

import { anchorFromToolResult } from './anchors/extract'
import { createPendingQueue, type PendingQueue } from './anchors/pending'
import { readReviewConclusion } from './anchors/review-verdict'
import { applyBoardAction } from './board/apply'
import { ensureSharedBoard, type SharedBoardResult } from './board/share'
import {
  boardActionForDispatch,
  boardActionForReview,
  boardActionForWatch,
  enqueueBoardAction,
  type BoardAction
} from './board/sync'
import { readBoardSummary } from './board/task-board'
import type { Activation, HerdrAgentEntry, MemoryBackend, OrchestrationFact, PendingAnchor } from './contracts'
import { evaluateDispatchLimit } from './dispatch/concurrency'
import { readControlConfig, type ControlConfig } from './dispatch/config'
import {
  movePaneClearingZoom,
  tabMoveRequestFor,
  type PaneMoveOutcome,
  type PaneZoomClearOutcome
} from './dispatch/tabs'
import { renderInjection } from './memory/inject'
import { orchestrationKey } from './memory/keys'
import { createPiMemoryBackend } from './memory/pi-memory-backend'
import { recallOrchestration, renderRecall } from './memory/recall'
import type { ExtensionContext } from './pi-types'
import { resolveRepoIdentity, type RepoIdentity } from './repo-identity'
import {
  BLOCKED_TOOLS,
  blockedReason,
  isBlockedInShepherd,
  renderShepherdInstructions,
  withoutBlockedTools,
  type ShepherdState
} from './shepherd'

/**
 * 桥接扩展真正依赖的最小 Pi 面。
 *
 * 它与 `pi-types.ts` 的 `ExtensionAPI` 结构一致，所以入口可以直接把 Pi 的 API 传进来；
 * 事件与 ctx 用 `never` 收口，具体形状在处理器内部按需断言——桥接只读极少数字段，写死
 * Pi 的完整事件类型会把每个钩子都变成一次类型体操。
 */
export interface BridgePi {
  on(event: string, handler: (event: never, ctx: BridgeContext) => unknown): () => void
  registerTool(tool: object): void
  registerCommand(name: string, options: object): void
  /** 协调者模式要摘掉 edit / write，所以需要读写激活工具集。 */
  getActiveTools(): string[]
  setActiveTools(toolNames: string[]): void
}

/**
 * 钩子上下文就是 Pi 的扩展上下文。
 *
 * `pi-types.ts` 里只声明桥接真正读写的字段，所以类型上不需要第二份定义——两份定义会随
 * Pi 的演进彼此漂移，而入口处本来就要做一次结构断言。
 */
export type BridgeContext = ExtensionContext

export interface BridgeOptions {
  readonly activation: Activation
  /** 注入的 token 预算；默认见 `DEFAULT_TOKEN_BUDGET`。 */
  readonly tokenBudget?: number
  /**
   * 编排控制（并发上限、独立 tab）的依赖。
   *
   * 默认实现必须由装配方（`src/index.ts`）显式注入：`createBridge` 自己不起子进程，否则
   * 测试或直接装配时会在 `tool_result` 里移动真实的 Herdr pane。缺省某一项时对应能力关闭。
   */
  readonly control?: DispatchControlDeps
}

/** 编排控制的注入点。 */
export interface DispatchControlDeps {
  /** 读 `herdr agent list`。缺省时不做并发限制。 */
  readonly listAgents?: () => Promise<ReadonlyArray<HerdrAgentEntry>>
  /** 把 pane 移到新 tab。缺省时不做 tab 分离。 */
  readonly movePane?: (paneId: string, label: string) => Promise<PaneMoveOutcome>
  /** 取消 pane 所在 tab 的 zoom（`herdr pane zoom <pane> --off`）。缺省时 zoomed 拒绝维持原样。 */
  readonly clearPaneZoom?: (paneId: string) => Promise<PaneZoomClearOutcome>
  /** 配置文件路径；缺省是 `~/.pi/agent/pi-herdr-orchestrator/config.json`。 */
  readonly configPath?: string
  /** 显式覆盖，优先于 config.json；用于测试与直接装配。 */
  readonly maxConcurrentWorkers?: number
  readonly separateTabs?: boolean
}

export const SAVE_TOOL_NAME = 'orchestration_memory_save'

/** 召回工具名。 */
export const RECALL_TOOL_NAME = 'orchestration_memory_recall'

/** 每个会话的运行时状态。 */
interface RuntimeState {
  /** 机器级仓库身份；同一仓库的所有 worktree 共享同一个 key。 */
  identity: RepoIdentity
  cwd: string
}

/** 待执行的任务板动作；同样只能经工具落盘，所以与记忆锚点共用一轮 flush。 */
type PendingBoardAction = BoardAction

/**
 * 单个待写项最多被 `agent_before_settle` 追加几轮。
 *
 * Pi 的 run 循环没有次数上限：钩子只要返回 `continue: true` 就会再发一轮模型请求。写入
 * 工具持续失败时（例如 `pi-memory` 没装，`memory_remember` 是未知工具），队列永远非空，
 * 不设上限就会一直追加模型回合，直到用户手动中断。超限的项被丢弃并通知原因，已成功写入
 * 的部分不受影响。
 */
export const MAX_SETTLE_APPENDS = 3

/** 追加计数按逻辑目标记账：锚点用 kind + slot，任务板动作用标题。 */
function settleKeyForAnchor(anchor: PendingAnchor): string {
  return `anchor\u0000${anchor.kind}\u0000${anchor.slot}`
}

function settleKeyForBoard(action: PendingBoardAction): string {
  return `board\u0000${action.title}`
}

/**
 * 把 `executeTool` 的结果压成 `{ ok, text }`。
 *
 * `executeTool` 从不 reject（失败也是 `isError: true` 的结果），所以这里只做形状归一。
 * 嵌套形状与兼容字段见 `pi-types.ts` 的 `AgentToolCallOutcome`。
 */
export async function callToolVia(
  ctx: BridgeContext,
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: boolean; text: string }> {
  if (typeof ctx.executeTool !== 'function') {
    return { ok: false, text: `nested tool call unavailable in this context: ${name}` }
  }
  const outcome = await ctx.executeTool(name, args)
  const payload = outcome.result ?? outcome
  const ok = (payload.isError ?? outcome.isError) !== true

  const fromContent = (payload.content ?? [])
    .map(part => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim()
  if (fromContent) return { ok, text: fromContent }

  // `content` 可能为空，真正的产出在 `structuredContent` 或 `details.summary` 里。
  // pi-task-board 把给人看的 summary 放在 `details.summary`，不读它会让 `get_panel` 静默返回空串。
  const structured = stringifyPayload(payload.structuredContent)
  if (structured) return { ok, text: structured }
  const details = payload.details
  const summary =
    typeof details === 'object' && details !== null
      ? stringifyPayload((details as { summary?: unknown }).summary)
      : undefined
  return { ok, text: summary ?? '' }
}

/** 把嵌套工具的结构化产出压成文本；已经是字符串就原样返回。 */
function stringifyPayload(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value !== 'object') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}

/** 状态栏的 key；与 pi-task-board 的 key 不冲突。 */
const STATUS_KEY = 'shepherd'

/**
 * 刷新状态栏。
 *
 * 协调者模式改变的是「这个会话能不能改代码」，属于必须随时可见的状态：`/shepherd` 无参数
 * 是切换语义，用户没法从命令本身推断当前值。状态栏是唯一的常驻提示。
 *
 * 没有 UI（print / json 模式）时静默跳过。
 */
function refreshStatus(ctx: BridgeContext, active: boolean, pendingCount: number): void {
  try {
    ctx.ui?.setStatus?.(
      STATUS_KEY,
      active ? `SHEPHERD · 只编排不改码${pendingCount > 0 ? ` · ${pendingCount} 待落盘` : ''}` : undefined
    )
  } catch {
    // 非交互模式没有状态栏；状态显示是尽力而为。
  }
}

/** 一行式状态描述，`/shepherd status` 与重复切换时都用它。 */
function describeStatus(current: { identity: RepoIdentity }, shepherdState?: ShepherdState, pendingCount = 0): string {
  return [
    `shepherd mode: ${shepherdState?.active ? 'ON' : 'OFF'}`,
    `repo: ${current.identity.key}`,
    shepherdState?.active ? 'removed tools: edit, write' : 'edit/write available',
    `pending: ${pendingCount}`
  ].join(' · ')
}

function notify(ctx: BridgeContext, message: string, type: 'info' | 'warning' = 'info'): void {
  try {
    ctx.ui?.notify(message, type)
  } catch {
    // 非交互模式可能没有 notify；通知是尽力而为，不影响桥接逻辑。
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 把共享板的结果翻成一行通知。
 *
 * 主 checkout 自己就是真身、已经共享过，都不值得每次会话打扰用户；只有「刚建好」「刚迁移」
 * 「刚重建缺失目标」和「拒绝 / 失败」需要说一声。拒绝时用户必须知道原因，否则会以为板坏了。
 */
function describeSharedBoard(outcome: SharedBoardResult): string | undefined {
  switch (outcome.status) {
    case 'linked':
      return `task board shared across worktrees: ${outcome.target}`
    case 'migrated':
      return `task board shared across worktrees: merged into ${outcome.target}; previous .pi kept at ${outcome.backupPath}`
    case 'repaired':
      return `task board shared across worktrees: recreated missing ${outcome.target}`
    case 'refused':
    case 'failed':
      return `task board not shared: ${outcome.reason}`
    default:
      return undefined
  }
}

/**
 * 重放 transcript 里的工具声明，返回仍处于「被摘掉」状态的协调者工具。
 *
 * 读法与 Pi 的 `_restoreToolsFromTranscript`（1.4.0 的
 * `dist/core/agent-session.js:1389-1413`）一致：只认 `type: "message"` 且
 * `role: "system"` 的条目，按分支顺序应用 `toolsRemoved` / `toolsAdded`（同一条消息内先移除
 * 后添加，与 pi-ai 的 `getCurrentTools` 相同），最后一次声明决定工具是否激活。条目形状不
 * 认识就当作没有声明——那是 Pi 的内部格式，不能让异常进 `session_start`。
 */
export function blockedToolsRemovedByTranscript(transcript: unknown): string[] {
  const state = new Map<string, boolean>()
  if (!Array.isArray(transcript)) return []
  for (const entry of transcript) {
    if (!isRecord(entry) || entry.type !== 'message') continue
    const message = entry.message
    if (!isRecord(message) || message.role !== 'system') continue
    applyToolDeclarations(state, message.toolsRemoved, false)
    applyToolDeclarations(state, message.toolsAdded, true)
  }
  return BLOCKED_TOOLS.filter(name => state.get(name) === false)
}

function applyToolDeclarations(state: Map<string, boolean>, declarations: unknown, active: boolean): void {
  if (!Array.isArray(declarations)) return
  for (const declaration of declarations) {
    if (!isRecord(declaration)) continue
    const name = declaration.name
    if (typeof name === 'string') state.set(name, active)
  }
}

/**
 * resume 修复：把被 `/shepherd` 摘掉、却没有被恢复的 edit / write 加回激活集。
 *
 * `/shepherd on` 改过激活集之后，下一次请求会把 `toolsRemoved: [edit, write]` 记进
 * transcript。进程重启后 resume 该会话时，Pi 在 `AgentSession` 构造阶段就按 transcript
 * 重放 loadout（agent-session.js:214），所以 `session_start` 触发时 edit / write 已经不在
 * 激活集里；`session_shutdown` 的还原只覆盖同进程的 reload / 退出，够不到这条路径。
 *
 * 判定同时要求三件事，避免覆盖别处的意图：
 * 1. transcript 的重放结果显示这两个工具都被 `toolsRemoved` 摘掉——这是 `/shepherd on`
 *    留下的签名；从未激活过（例如 settings 的 `defaultTools` 不含它们）不会留下这条记录。
 * 2. 它们当前都不在激活集里。只缺一个时不动手，那可能是别的扩展单独禁用了其中一个。
 * 3. `--tools` / `--exclude-tools` 排除的工具不在 Pi 的 registry 里，`setActiveTools`
 *    会忽略它们（`_applyToolLoadout`，agent-session.js:1175-1180），所以 CLI 的工具限制
 *    不会被覆盖。
 *
 * 残留歧义：任何扩展经 `setActiveTools` 摘掉 edit / write 都会在 transcript 留下同样的
 * 记录，桥接无法区分是谁摘的；那种扩展若在每次 `session_start` 重新禁用工具，最终结果由
 * 扩展加载顺序决定。
 */
export function restoreBlockedTools(active: readonly string[], transcript: unknown): string[] | undefined {
  const removed = blockedToolsRemovedByTranscript(transcript)
  if (removed.length !== BLOCKED_TOOLS.length) return undefined
  if (BLOCKED_TOOLS.some(name => active.includes(name))) return undefined
  return [...active, ...BLOCKED_TOOLS]
}

/**
 * 组装桥接扩展。
 *
 * Pi 只调用扩展的 default 导出函数，不消费工厂的返回值，所以 reload / 退出时的清理入口是
 * 这里注册的 `session_shutdown` 钩子。返回的 `dispose` 保留给测试与直接装配方，与钩子走
 * 同一段清理逻辑，且幂等。
 */
export function createBridge(pi: BridgePi, options: BridgeOptions): { dispose: () => void } {
  // 激活门槛不成立时立刻返回：不注册钩子、不注册工具、不读文件、不起子进程。
  if (!options.activation.active) return { dispose: () => {} }

  const pending: PendingQueue = createPendingQueue()
  // 任务板动作也要在同一轮 flush 里执行，否则 before_settle 会为两类待办各触发一次追加回合。
  const boardQueue: PendingBoardAction[] = []
  // 每个待写项已经被 settle 追加过几轮；超过 MAX_SETTLE_APPENDS 后丢弃。
  const settleAttempts = new Map<string, number>()
  // 最近一次保存失败的原因；超限丢弃时写进通知，说明为什么放弃。
  let lastSaveError: string | undefined
  let state: RuntimeState | undefined
  // 协调者模式：默认关闭，由 /shepherd 开启。
  const shepherd: ShepherdState = { active: false }

  const control = options.control
  // reviewer 名单来自 herdr_review 的终态；并发闸门只让它们不进 worker 槽位。
  const reviewerNames = new Set<string>()
  let controlConfigPromise: Promise<ControlConfig> | undefined
  let controlConfigWarningShown = false

  /**
   * 读一次控制配置并缓存。
   *
   * 工具调用是热路径，每次 dispatch 都读盘没有必要；配置在会话内变化时 `/reload` 会重建
   * 桥接。读取失败/非法值只通知一次，否则同一句告警会跟着每次 dispatch 刷屏。
   */
  const resolveControlConfig = async (
    ctx: BridgeContext
  ): Promise<{ maxConcurrentWorkers: number; separateTabs: boolean }> => {
    if (!controlConfigPromise) controlConfigPromise = readControlConfig(control?.configPath)
    const config = await controlConfigPromise
    if (config.warning && !controlConfigWarningShown) {
      controlConfigWarningShown = true
      notify(ctx, `shepherd config: ${config.warning}；使用缺省值。`, 'warning')
    }
    return {
      maxConcurrentWorkers: control?.maxConcurrentWorkers ?? config.maxConcurrentWorkers,
      separateTabs: control?.separateTabs ?? config.separateTabs
    }
  }

  /**
   * 统一清理路径。
   *
   * Pi 在 reload / 退出时向旧 runner 发 `session_shutdown`，不消费工厂返回值；测试与直接
   * 装配方用返回的 `dispose`。两条路径都汇到这里，所以必须幂等、可重入：重复调用只是在
   * 已清空的状态上再清一次。
   *
   * `setActiveTools` 在 Pi 已失效时会抛错，退出路径不能因此失败；其余错误不吞。
   */
  const cleanup = (): void => {
    // 协调者模式必须还原工具集，否则 reload 之后 edit/write 会永久消失。
    if (shepherd.active && shepherd.previousTools) {
      try {
        pi.setActiveTools([...shepherd.previousTools])
      } catch {
        // Pi 已失效时恢复会抛错；退出路径不该因此失败。
      }
    }
    shepherd.active = false
    shepherd.previousTools = undefined
    reviewerNames.clear()
    controlConfigPromise = undefined
    controlConfigWarningShown = false
    pending.clear()
    boardQueue.length = 0
    settleAttempts.clear()
    lastSaveError = undefined
    state = undefined
  }

  const ensureState = (cwd: string): RuntimeState => {
    if (!state) state = { identity: resolveRepoIdentity(cwd), cwd }
    return state
  }

  pi.on('session_start', async (_event, ctx) => {
    pending.clear()
    boardQueue.length = 0
    settleAttempts.clear()
    lastSaveError = undefined
    // 新会话可能有新的 reviewer 与配置；不要让上一会话的名单/缓存漏进来。
    reviewerNames.clear()
    controlConfigPromise = undefined
    controlConfigWarningShown = false
    state = { identity: resolveRepoIdentity(ctx.cwd), cwd: ctx.cwd }
    // reload / 新会话后内存状态是 false；清掉可能残留的状态栏，避免显示与实际不符。
    refreshStatus(ctx, false, 0)
    // resume-from-transcript：Pi 在构造会话时已按 transcript 重放了 loadout，`/shepherd on`
    // 摘掉的 edit / write 会保持未激活。`session_start` 晚于构造触发，是补回它们的时机。
    const sessionManager = (ctx as { sessionManager?: { getBranch?: () => unknown } }).sessionManager
    let transcript: unknown
    try {
      transcript = sessionManager?.getBranch?.()
    } catch {
      // 读不到会话分支时维持现状：工具集是会话能否工作的前提，不能因此让 session_start 失败。
      transcript = undefined
    }
    const repairedTools = restoreBlockedTools(pi.getActiveTools(), transcript)
    if (repairedTools) {
      try {
        pi.setActiveTools(repairedTools)
      } catch {
        // 修复是尽力而为：写激活集失败时维持现状，不能让它中断 session_start 的其余工作。
      }
    }
    // 共享板只在这里做：写入路径固定跟着 cwd，能在文件系统层统一的只有这一处。
    const shared = ensureSharedBoard(ctx.cwd)
    const sharedMessage = describeSharedBoard(shared)
    if (sharedMessage) {
      notify(ctx, sharedMessage, shared.status === 'refused' || shared.status === 'failed' ? 'warning' : 'info')
    }
    notify(ctx, `orchestration memory bridge active (repo: ${state.identity.key})`)
  })

  pi.on('session_shutdown', async () => {
    // Pi 唯一的退出回调；reload 时它先于新 runtime 构建到达，所以必须在此之前还原工具集。
    cleanup()
    return undefined
  })

  pi.on('before_agent_start', async (event, ctx) => {
    const systemPromptOptions = (event as { systemPromptOptions?: { sections?: Record<string, string> } })
      .systemPromptOptions
    const sections = systemPromptOptions?.sections
    if (!sections) return undefined

    const current = ensureState(ctx.cwd)

    // 只注入 board：编排记忆要经 `pi-memory` 查询，而钩子没有 `executeTool`。把记忆塞进这里
    // 就必然需要一份本地缓存，而缓存会与权威源漂移——所以改成按需召回（见 recall.ts）。
    const board = await readBoardSummary(current.cwd)
    const injection = renderInjection([], {
      board,
      ...(options.tokenBudget === undefined ? {} : { tokenBudget: options.tokenBudget })
    })

    if (injection) sections.orchestration = injection
    // 没有内容时删掉段，避免空壳撑大 system prompt。
    else delete sections.orchestration

    // 协调者模式另起一段：它与 board 摘要变化频率不同，混在一起会让缓存每轮失效。
    if (shepherd.active) {
      sections.shepherd = renderShepherdInstructions({
        repoKey: current.identity.key,
        root: current.identity.root
      })
    } else {
      delete sections.shepherd
    }
    return undefined
  })

  /**
   * 工具调用的两道闸门。
   *
   * 1. 协调者模式的硬约束：拦住 edit / write。光把工具从激活集里摘掉还不够——模型可能在
   *    本轮的工具声明里还看得见它（声明在请求前生成），或者从 codemode 脚本里调。
   * 2. `herdr_dispatch` 的并发上限：查一次 `herdr agent list`，正在跑的 worker 达到
   *    `shepherd.maxConcurrentWorkers` 就拒绝，并给出当前 worker 名、上限与出路。
   *
   * 查询失败 fail open：闸门本身不可用时不能把 dispatch 永久禁掉，只通知一次原因。
   */
  pi.on('tool_call', async (event, ctx) => {
    const typed = event as { toolName?: string }
    if (!typed.toolName) return undefined

    if (shepherd.active && isBlockedInShepherd(typed.toolName)) {
      return { block: true, reason: blockedReason(typed.toolName) }
    }

    const listAgents = control?.listAgents
    if (typed.toolName !== 'herdr_dispatch' || !listAgents) return undefined

    const config = await resolveControlConfig(ctx)

    let agents: ReadonlyArray<HerdrAgentEntry>
    try {
      agents = await listAgents()
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      notify(ctx, `dispatch 并发检查失败（herdr agent list: ${detail}）；本次放行（fail open）。`, 'warning')
      return undefined
    }

    const verdict = evaluateDispatchLimit({
      agents,
      maxConcurrentWorkers: config.maxConcurrentWorkers,
      reviewerNames
    })
    if (verdict.allowed) return undefined
    return { block: true, reason: verdict.reason }
  })

  // worker / reviewer 各自独立 tab。与记忆、看板是独立关注点：移动失败只通知，绝不让
  // `herdr_dispatch` / `herdr_review` 的结果变成 isError。
  pi.on('tool_result', async (event, ctx) => {
    const typed = event as { toolName?: string; details?: unknown }
    if (!typed.toolName) return undefined

    // reviewer 经 herdr_review 单独登记：并发闸门只让 worker 占槽位。
    if (typed.toolName === 'herdr_review' && isRecord(typed.details)) {
      const name = typeof typed.details.name === 'string' ? typed.details.name.trim() : ''
      if (name) reviewerNames.add(name)
    }

    const movePane = control?.movePane
    if (!movePane) return undefined
    const clearPaneZoom = control?.clearPaneZoom
    const request = tabMoveRequestFor(typed.toolName, typed.details)
    if (!request) return undefined
    // 绝不移动 lead 自己的 pane：那是用户正在看和输入的那个。
    if (options.activation.active && request.paneId === options.activation.paneId) return undefined

    const config = await resolveControlConfig(ctx)
    if (!config.separateTabs) return undefined

    try {
      // 有取消 zoom 能力时，zoomed 拒绝会先取消再重试一次；没有时维持原样。
      const outcome = clearPaneZoom
        ? await movePaneClearingZoom({ movePane, clearPaneZoom }, request.paneId, request.label)
        : await movePane(request.paneId, request.label)
      if (outcome.moved && outcome.zoomCleared) {
        notify(ctx, `${request.label} 移到了独立 tab（${request.paneId}）：为分离 tab 取消了一次 zoom，worker 不受影响`)
      } else if (outcome.moved) {
        notify(ctx, `moved ${request.label} to its own tab (${request.paneId})`)
      } else if (outcome.zoomCleared) {
        notify(
          ctx,
          `${request.label} 已取消 zoom，但仍未能移到独立 tab：${outcome.reason ?? 'unknown error'}`,
          'warning'
        )
      } else if (outcome.zoomed && clearPaneZoom) {
        notify(
          ctx,
          `${request.label} 未能移到独立 tab：取消 zoom 失败（${outcome.reason ?? 'unknown error'}）`,
          'warning'
        )
      } else if (outcome.zoomed) {
        notify(ctx, `${request.label} 所在 tab 处于 zoom，未能移到独立 tab；worker 不受影响。`, 'warning')
      } else {
        notify(ctx, `${request.label} 未能移到独立 tab：${outcome.reason ?? 'unknown error'}`, 'warning')
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      notify(ctx, `${request.label} 未能移到独立 tab：${detail}`, 'warning')
    }
    return undefined
  })

  pi.on('tool_result', async event => {
    const typed = event as { toolName?: string; details?: unknown }
    if (!typed.toolName) return undefined
    const anchor = await anchorFromToolResult(typed.toolName, typed.details)
    if (!anchor || !state) return undefined

    // 只入队，不落盘：写入必须经 `executeTool`，那只有保存工具拿得到。
    pending.push(anchor)
    return undefined
  })

  // 任务板同步单独挂一个钩子：它与记忆锚点是两条独立关注点，dispatch 不产生记忆但必须建任务，
  // 而 watch / review 的结论只在 board 侧有动作。放在同一个 handler 里会让两件事的失败互相牵连。
  pi.on('tool_result', async event => {
    const typed = event as { toolName?: string; details?: unknown }
    if (!typed.toolName || !state) return undefined

    if (typed.toolName === 'herdr_dispatch') {
      const action = boardActionForDispatch(typed.details)
      if (action) {
        enqueueBoardAction(boardQueue, action)
        // 新事件带来新目标状态：该 slice 的重试预算重新开始。
        settleAttempts.delete(settleKeyForBoard(action))
      }
      return undefined
    }
    // 很多 slice 在 watch 到 DONE 后直接结束、不经过 review，所以 watch 也要推进看板。
    if (typed.toolName === 'herdr_watch') {
      const action = boardActionForWatch(typed.details)
      if (action) {
        enqueueBoardAction(boardQueue, action)
        settleAttempts.delete(settleKeyForBoard(action))
      }
      return undefined
    }
    if (typed.toolName !== 'herdr_review') return undefined

    // review 的 details.verdict 与 reason 常是模板抢先命中的假值，先用文件里的真实结论覆盖，
    // 否则看板上会出现「review approved: <one or two sentences>」这种废话。
    const details = typed.details as { reviewFile?: string } | undefined
    const conclusion = await readReviewConclusion(details?.reviewFile)
    const action = boardActionForReview(typed.details, {
      ...(conclusion.verdict === 'UNKNOWN' ? {} : { verdict: conclusion.verdict }),
      ...(conclusion.reason ? { reason: conclusion.reason } : {})
    })
    if (action) {
      enqueueBoardAction(boardQueue, action)
      // 新事件带来新目标状态：该 slice 的重试预算重新开始。
      settleAttempts.delete(settleKeyForBoard(action))
    }
    return undefined
  })

  /**
   * 记一次 settle 追加；返回 true 表示这一项已经超过上限，必须丢弃。
   *
   * 计数在「这一轮要追加」时递增，所以同一项最多被追加 MAX_SETTLE_APPENDS 轮，第
   * MAX_SETTLE_APPENDS + 1 次 settle 时它被移出队列，不再产生模型回合。
   */
  const settleAttemptExceeded = (key: string): boolean => {
    const next = (settleAttempts.get(key) ?? 0) + 1
    if (next > MAX_SETTLE_APPENDS) return true
    settleAttempts.set(key, next)
    return false
  }

  pi.on('agent_before_settle', async (_event, ctx) => {
    const dropped: string[] = []

    for (const anchor of pending.peek()) {
      const attemptKey = settleKeyForAnchor(anchor)
      if (!settleAttemptExceeded(attemptKey)) continue
      // 写入持续失败：丢弃它。已成功写入的锚点不在这里，不受影响。
      pending.resolve(anchor)
      settleAttempts.delete(attemptKey)
      dropped.push(`memory ${anchor.kind}: ${anchor.value}`)
    }

    // 先收集再统一移除：循环里直接 splice 会跳过下一个元素。
    const expiredBoard: PendingBoardAction[] = []
    for (const action of boardQueue) {
      const attemptKey = settleKeyForBoard(action)
      if (!settleAttemptExceeded(attemptKey)) continue
      settleAttempts.delete(attemptKey)
      expiredBoard.push(action)
      dropped.push(`board ${action.kind} "${action.title}" -> ${action.status}`)
    }
    for (const action of expiredBoard) {
      const index = boardQueue.indexOf(action)
      if (index >= 0) boardQueue.splice(index, 1)
    }

    if (dropped.length > 0) {
      const plural = dropped.length === 1 ? 'entry' : 'entries'
      notify(
        ctx,
        [
          `dropped ${dropped.length} pending orchestration ${plural} after ${MAX_SETTLE_APPENDS} save attempts; they will not be retried.`,
          ...(lastSaveError ? [`last save error: ${lastSaveError}`] : []),
          ...dropped.map(line => `- ${line}`)
        ].join('\n'),
        'warning'
      )
    }

    if (pending.size() === 0 && boardQueue.length === 0) return undefined
    const lines = [
      ...pending.peek().map(anchor => `- memory ${anchor.kind}: ${anchor.value}`),
      ...boardQueue.map(action => `- board ${action.kind} "${action.title}" -> ${action.status}`)
    ]
    return {
      continue: true,
      entries: [
        {
          type: 'custom_message',
          customType: 'orchestration-memory-pending',
          display: false,
          content: [
            `Orchestration state has unsaved entries. Call \`${SAVE_TOOL_NAME}\` once`,
            'with `{ "flush": true }` to persist them, then continue with your work.',
            '',
            ...lines
          ].join('\n')
        }
      ]
    }
  })

  pi.registerTool({
    name: SAVE_TOOL_NAME,
    label: 'Orchestration Memory Save',
    description:
      'Persist pending orchestration anchors (approved plan decisions, rejected review reasons) into pi-memory. Call with flush: true when instructed. Optionally pass key and value to record one explicit decision.',
    promptSnippet: 'Persist pending orchestration memory anchors',
    exposure: 'model-only',
    // Pi 只要求 parameters 是「对象 schema」，普通 JSON Schema 字面量即可，不必依赖 typebox。
    // 依赖它会迫使本包把 typebox 写进 devDependencies（运行时由 Pi 的虚拟模块供给，测试里却
    // 解析不到），或者在测试里再造一份替身。
    parameters: {
      type: 'object',
      properties: {
        flush: {
          type: 'boolean',
          description: 'Persist every pending anchor. Default: true when the tool is called.'
        },
        key: { type: 'string', description: 'Explicit decision slot name; requires value.' },
        value: { type: 'string', description: 'Explicit decision text; requires key.' },
        pin: {
          type: 'boolean',
          description:
            'Request a pin; orchestration keys are unpinned after write because pinned injection is not repo-scoped.'
        }
      },
      additionalProperties: false
    },
    async execute(
      _id: unknown,
      params: { flush?: boolean; key?: string; value?: string; pin?: boolean },
      _signal: unknown,
      _onUpdate: unknown,
      ctx: BridgeContext
    ) {
      const current = state
      if (!current) {
        return {
          content: [{ type: 'text' as const, text: 'orchestration memory bridge is not active' }],
          details: undefined,
          isError: true
        }
      }

      const memory: MemoryBackend = createPiMemoryBackend({
        callTool: (name, args) => callToolVia(ctx, name, args)
      })
      const written: string[] = []

      if (params.key && params.value) {
        const key = orchestrationKey(current.identity.key, 'decision', params.key)
        try {
          // 默认不 pin：编排键不以 `project.` 开头，pi-memory 的 pinned 注入不按仓库分区，
          // 一 pin 就会出现在同机所有仓库的 system prompt 里。
          await memory.remember({ key, value: params.value, pinned: params.pin === true })
          // 写入本身不会清掉 `pinned` 列，旧版本或手工 pin 过的键必须显式撤销。
          await memory.ensureUnpinned(key)
        } catch (error) {
          return failure(key, error)
        }
        written.push(key)
      }

      for (const anchor of pending.peek()) {
        const key = orchestrationKey(current.identity.key, anchor.kind, anchor.slot)
        try {
          await memory.remember({ key, value: anchor.value })
          await memory.ensureUnpinned(key)
        } catch (error) {
          return failure(key, error)
        }
        pending.resolve(anchor)
        settleAttempts.delete(settleKeyForAnchor(anchor))
        written.push(key)
      }

      // 任务板动作与记忆走同一轮 flush：两者都只能经 `executeTool` 落盘，分两次会白多一个回合。
      const boardResults: string[] = []
      while (boardQueue.length > 0) {
        const action = boardQueue[0]
        if (!action) break
        const outcome = await applyBoardAction((name, args) => callToolVia(ctx, name, args), action)
        boardResults.push(`${action.kind} "${action.title}" -> ${action.status}: ${outcome.ok ? 'ok' : 'failed'}`)
        if (!outcome.ok) {
          lastSaveError = `${action.kind} "${action.title}": ${outcome.detail || 'failed'}`
          return {
            content: [
              {
                type: 'text' as const,
                text: [...written.map(k => `saved: ${k}`), `board failed: ${outcome.detail}`].join('\n')
              }
            ],
            details: { written, boardResults, failed: action.title },
            isError: true
          }
        }
        settleAttempts.delete(settleKeyForBoard(action))
        boardQueue.shift()
      }

      lastSaveError = undefined
      const summary = [...written.map(key => `saved: ${key}`), ...boardResults]
      return {
        content: [{ type: 'text' as const, text: summary.length === 0 ? 'nothing to save' : summary.join('\n') }],
        details: { written, boardResults, pending: pending.size() },
        isError: false
      }
    }
  })

  /**
   * 召回工具。
   *
   * 编排记忆不自动注入（钩子拿不到 `executeTool`），所以 lead 必须在计划之前主动读一次，
   * 否则它会对「上一轮为什么被拒」一无所知。工具描述里写死了这条要求。
   */
  pi.registerTool({
    name: RECALL_TOOL_NAME,
    label: 'Orchestration Memory Recall',
    description: [
      'Read this repository orchestrations past decisions and rejections from pi-memory.',
      'Call it before herdr_plan in every session that continues prior orchestration work:',
      'the memory is not injected into your context automatically.'
    ].join(' '),
    promptSnippet: 'Read past orchestration decisions and rejections for this repository',
    promptGuidelines: [
      'Call orchestration_memory_recall before herdr_plan when the session may continue earlier orchestration work.',
      'Orchestration memory is not injected automatically; without this call you cannot know why a slice was rejected before.'
    ],
    exposure: 'model-only',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum facts to retrieve. Default: 100.'
        }
      },
      additionalProperties: false
    },
    async execute(_id: unknown, params: { limit?: number }, _signal: unknown, _onUpdate: unknown, ctx: BridgeContext) {
      const current = state
      if (!current) {
        return {
          content: [{ type: 'text' as const, text: 'orchestration memory bridge is not active' }],
          details: undefined,
          isError: true
        }
      }
      const memory: MemoryBackend = createPiMemoryBackend({
        callTool: (name, args) => callToolVia(ctx, name, args)
      })
      try {
        const result = await recallOrchestration(
          memory,
          current.identity,
          params.limit === undefined ? {} : { limit: params.limit }
        )
        return {
          content: [{ type: 'text' as const, text: renderRecall(current.identity, result) }],
          details: {
            repo: current.identity.key,
            facts: result.facts.length,
            rejected: result.rejected,
            decisions: result.decisions,
            truncated: result.truncated
          },
          isError: false
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return {
          content: [{ type: 'text' as const, text: `recall failed: ${message}` }],
          details: { repo: current.identity.key },
          isError: true
        }
      }
    }
  })

  /**
   * `/shepherd` —— 进入或退出协调者模式。
   *
   * 一个命令带两个方向（`on` / `off` / 无参数切换），而不是两个命令：用户不该记「退出叫什么」。
   */
  pi.registerCommand('shepherd', {
    description: 'Enter or leave coordinator mode (lead plans and dispatches, never edits code)',
    handler: async (args: string, ctx: BridgeContext) => {
      const current = state
      if (!current) {
        notify(ctx, 'orchestration memory bridge is not active', 'warning')
        return
      }

      const mode = args.trim().toLowerCase()

      // `status` 只报告，不切换。没有它的话用户无法在切换前知道当前值。
      if (mode === 'status') {
        notify(ctx, describeStatus(current, shepherd, pending.size()))
        return
      }

      const turnOn = mode === 'on' ? true : mode === 'off' ? false : !shepherd.active

      if (turnOn === shepherd.active) {
        notify(
          ctx,
          `already ${shepherd.active ? 'in' : 'not in'} shepherd mode\n${describeStatus(current, shepherd, pending.size())}`
        )
        return
      }

      if (turnOn) {
        const active = pi.getActiveTools()
        shepherd.previousTools = active
        shepherd.active = true
        pi.setActiveTools(withoutBlockedTools(active))
        refreshStatus(ctx, true, pending.size())
        notify(
          ctx,
          [
            'shepherd mode ON — 本会话只做编排，不直接改代码。',
            '已从工具集移除：edit, write（调用会被拒绝）。',
            '流程：orchestration_memory_recall → herdr_plan → 批准 → herdr_dispatch → herdr_watch → herdr_review。'
          ].join('\n')
        )
        return
      }

      shepherd.active = false
      if (shepherd.previousTools) pi.setActiveTools([...shepherd.previousTools])
      shepherd.previousTools = undefined
      refreshStatus(ctx, false, pending.size())
      notify(ctx, 'shepherd mode OFF — 恢复直接编辑能力。')
    }
  })

  pi.registerCommand('orchestration-memory', {
    description: 'Show the active orchestration state',
    handler: async (_args: string, ctx: BridgeContext) => {
      const current = state
      if (!current) {
        notify(ctx, 'orchestration memory bridge is not active', 'warning')
        return
      }
      const board = await readBoardSummary(current.cwd)
      notify(
        ctx,
        [
          `repo: ${current.identity.key} (${current.identity.root})`,
          `pending: ${pending.size()}`,
          `board: ${board ? board.panel : '(unavailable)'}`,
          'run orchestration_memory_recall to read past decisions'
        ].join('\n')
      )
    }
  })

  // Pi 不消费这个返回值；它只会调用注册的 `session_shutdown`。保留 dispose 供测试与
  // 直接装配方复用同一段清理逻辑。
  return { dispose: cleanup }

  function failure(key: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    lastSaveError = message
    return {
      content: [{ type: 'text' as const, text: `failed to persist ${key}: ${message}` }],
      details: { failed: key },
      isError: true
    }
  }
}
