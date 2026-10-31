/**
 * 桥接扩展的装配层。
 *
 * 这个模块不含 I/O 细节，只把钩子接到纯函数上，并固定「何时读、何时写、写哪里」的时序：
 *
 * - `session_start`：解析仓库身份（同一仓库的所有 worktree 共享一个 key）。
 * - `before_agent_start`：只把 board 摘要渲染进 `sections.orchestration`。编排记忆**不自动注入**
 *   ——钩子拿不到 `executeTool`，查不了 `pi-memory`；要读过 `orchestration_memory_recall`。
 * - `tool_result`：识别 `herdr_plan` / `herdr_review` 的锚点，压入 pending 队列；同时把
 *   dispatch / review 事件映射成任务板动作，压进同一个队列。
 * - `agent_before_settle`：有 pending 时追加一轮指令，让模型调用保存工具。
 * - 保存 / 召回工具的 `execute()`：唯一拿得到 `executeTool` 的地方，负责落 pi-memory 与任务板。
 *
 * 激活门槛不成立时 `createBridge` 立即返回，不注册任何钩子与工具——worker pane 里必须无痕。
 */

import { anchorFromToolResult } from './anchors/extract'
import { createPendingQueue, type PendingQueue } from './anchors/pending'
import { readReviewConclusion } from './anchors/review-verdict'
import { applyBoardAction } from './board/apply'
import { boardActionForDispatch, boardActionForReview, enqueueBoardAction, type BoardAction } from './board/sync'
import { readBoardSummary } from './board/task-board'
import type { Activation, MemoryBackend, OrchestrationFact } from './contracts'
import { renderInjection } from './memory/inject'
import { orchestrationKey } from './memory/keys'
import { createPiMemoryBackend } from './memory/pi-memory-backend'
import { recallOrchestration, renderRecall } from './memory/recall'
import type { ExtensionContext } from './pi-types'
import { resolveRepoIdentity, type RepoIdentity } from './repo-identity'
import {
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
 * 把 `executeTool` 的结果压成 `{ ok, text }`。
 *
 * `executeTool` 从不 reject（失败也是 `isError: true` 的结果），所以这里只做形状归一。
 */
/**
 * 嵌套工具调用的真实返回形状。
 *
 * 实测：`ctx.executeTool()` 回的是 `{ toolCall, result: { content, details, structuredContent? }, isError, durationMs }`
 * —— **不是**扁平的 `{ content, isError }`。读错层级的表现是「写入成功但读取恒空」，非常隐蔽。
 */
interface NestedOutcome {
  readonly isError?: boolean
  readonly result?: {
    readonly content?: ReadonlyArray<{ type?: string; text?: string }>
    readonly details?: unknown
    readonly structuredContent?: unknown
    readonly isError?: boolean
  }
  // 兼容扁平的形状：某些宿主/版本可能直接回 content。
  readonly content?: ReadonlyArray<{ type?: string; text?: string }>
  readonly details?: unknown
  readonly structuredContent?: unknown
}

/** 把嵌套结果拍平成 `{ ok, text }`。 */
export async function callToolVia(
  ctx: BridgeContext,
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: boolean; text: string }> {
  if (typeof ctx.executeTool !== 'function') {
    return { ok: false, text: `nested tool call unavailable in this context: ${name}` }
  }
  const outcome = (await ctx.executeTool(name, args)) as NestedOutcome
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

/**
 * 组装桥接扩展。
 *
 * 返回的 `dispose` 清内存状态且幂等：取消、reload 与进程退出会汇到同一条清理路径。
 */
export function createBridge(pi: BridgePi, options: BridgeOptions): { dispose: () => void } {
  // 激活门槛不成立时立刻返回：不注册钩子、不注册工具、不读文件、不起子进程。
  if (!options.activation.active) return { dispose: () => {} }

  const pending: PendingQueue = createPendingQueue()
  // 任务板动作也要在同一轮 flush 里执行，否则 before_settle 会为两类待办各触发一次追加回合。
  const boardQueue: PendingBoardAction[] = []
  let state: RuntimeState | undefined
  // 协调者模式：默认关闭，由 /shepherd 开启。
  const shepherd: ShepherdState = { active: false }

  const ensureState = (cwd: string): RuntimeState => {
    if (!state) state = { identity: resolveRepoIdentity(cwd), cwd }
    return state
  }

  pi.on('session_start', async (_event, ctx) => {
    pending.clear()
    boardQueue.length = 0
    state = { identity: resolveRepoIdentity(ctx.cwd), cwd: ctx.cwd }
    // reload / 新会话后内存状态是 false；清掉可能残留的状态栏，避免显示与实际不符。
    refreshStatus(ctx, false, 0)
    notify(ctx, `orchestration memory bridge active (repo: ${state.identity.key})`)
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
   * 协调者模式的硬约束：拦住 edit / write。
   *
   * 光把工具从激活集里摘掉还不够——模型可能在本轮的工具声明里还看得见它（声明在请求前
   * 生成），或者从 codemode 脚本里调。这条钩子对每次调用都生效，且返回可读原因，避免模型
   * 反复重试同一个被拒的工具。
   */
  pi.on('tool_call', async event => {
    if (!shepherd.active) return undefined
    const typed = event as { toolName?: string }
    if (!typed.toolName || !isBlockedInShepherd(typed.toolName)) return undefined
    return { block: true, reason: blockedReason(typed.toolName) }
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
  // 而 review 的 APPROVE 只在 board 侧有动作。放在同一个 handler 里会让两件事的失败互相牵连。
  pi.on('tool_result', async event => {
    const typed = event as { toolName?: string; details?: unknown }
    if (!typed.toolName || !state) return undefined

    if (typed.toolName === 'herdr_dispatch') {
      const action = boardActionForDispatch(typed.details)
      if (action) enqueueBoardAction(boardQueue, action)
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
    if (action) enqueueBoardAction(boardQueue, action)
    return undefined
  })

  pi.on('agent_before_settle', async () => {
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
        pin: { type: 'boolean', description: 'Pin the explicit decision in pi-memory.' }
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
          await memory.remember({ key, value: params.value, pinned: params.pin ?? true })
        } catch (error) {
          return failure(key, error)
        }
        written.push(key)
      }

      for (const anchor of pending.peek()) {
        const key = orchestrationKey(current.identity.key, anchor.kind, anchor.slot)
        try {
          await memory.remember({ key, value: anchor.value })
        } catch (error) {
          return failure(key, error)
        }
        pending.resolve(anchor)
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
        boardQueue.shift()
      }

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

  return {
    dispose() {
      // 协调者模式在 dispose 时要把工具集还原，否则 reload 之后 edit/write 会永久消失。
      if (shepherd.active && shepherd.previousTools) {
        try {
          pi.setActiveTools([...shepherd.previousTools])
        } catch {
          // Pi 已失效时恢复会抛错；退出路径不该因此失败。
        }
      }
      shepherd.active = false
      shepherd.previousTools = undefined
      pending.clear()
      boardQueue.length = 0
      state = undefined
    }
  }

  function failure(key: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [{ type: 'text' as const, text: `failed to persist ${key}: ${message}` }],
      details: { failed: key },
      isError: true
    }
  }
}
