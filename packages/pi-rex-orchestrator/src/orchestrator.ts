/**
 * 协调者装配层：把注册表、rex 适配、交接区与护栏接到 Pi 的钩子与工具面上。
 *
 * 时序约定（与 Pi 宿主的真实契约对齐，见 `pi-types.ts`）：
 *
 * - `session_start`：挂只读工具白名单、启动事件环并做一次全量对账。
 * - `before_agent_start`：写结构化 `systemPromptOptions.sections`，不覆盖整段 prompt。
 * - `tool_call`：硬拦写工具与 destructiveHint MCP 工具。
 * - `context`：折叠被更新验收取代的旧 `rex_inspect_output` 输出。
 * - 事件环的终态通知经 `pi.sendMessage(..., { deliverAs: 'followUp', triggerTurn: true })`
 *   非阻塞唤醒，先按 1 秒窗口聚合；熔断后降级为一次性 `ctx.ui.notify()`。
 *
 * 真实的 rex 子进程只在入口（`index.ts`）注入；本模块的控制依赖全部可注入，测试与
 * 直接装配不会动到真实会话。
 */

import { randomUUID } from 'node:crypto'

import {
  cleanupWorktree,
  createWorktree,
  inspectChanges,
  mergeHint,
  runGit,
  scanIgnoredDeps,
  snapshotBase,
  worktreeBranch,
  worktreeDirtyNote,
  type GitExec
} from './git-inspector'
import { guardToolCall, guardToolList } from './guard'
import type { HandoffStore } from './handoff-store'
import { HANDOFF_ROOT } from './handoff-store'
import type { ExtensionContext, PiToolDefinition, PiToolResult } from './pi-types'
import { auditProfileArgs, resolveExecutable, type AgentProfile, type RexOrchestratorConfig } from './profiles'
import { coordinatorGuidelines, renderCoordinatorSection } from './prompt'
import type { RexAdapter } from './rex-adapter'
import { parseRexEventLine } from './rex-events'
import type { WorkerRegistry } from './state-machine'

/** 装配用的 Pi 面；与 `pi-types.ts` 的 `ExtensionAPI` 结构一致。 */
export interface BridgePi {
  on(event: string, handler: (event: never, ctx: ExtensionContext) => unknown): () => void
  registerTool(tool: PiToolDefinition): void
  registerCommand(
    name: string,
    options: { description: string; handler(args: string, ctx: ExtensionContext): Promise<void> | void }
  ): void
  exec(
    command: string,
    args: string[],
    options?: { cwd?: string; timeout?: number }
  ): Promise<{ stdout: string; stderr: string; code: number; killed: boolean; truncated: boolean }>
  sendMessage(
    message: { customType: string; content: string; display: boolean; details?: unknown },
    options?: { triggerTurn?: boolean; deliverAs?: 'steer' | 'followUp' | 'nextTurn' }
  ): void
  getActiveTools(): string[]
  setActiveTools(toolNames: string[]): void
}

export interface OrchestrationDeps {
  adapter: RexAdapter
  registry: WorkerRegistry
  profiles: Map<string, AgentProfile>
  /** Pi session id 在 `session_start` 才拿得到；交接区按它分目录，故延迟创建。 */
  createStore(sessionId: string): HandoffStore
  config?: RexOrchestratorConfig
  /** 配置审计（权限过宽等）的启动期告警，首个 session_start 时展示一次。 */
  configWarnings?: string[]
  /** run-headless 包装脚本的绝对路径。 */
  runHeadlessPath: string
  /** node 可执行绝对路径；headless 包装用它规避非交互 shell 的 PATH 缺失。 */
  nodePath: string
  /** 事件环重连的基准延迟。 */
  reconnectDelayMs?: number
  /** interactive 投递的 Send-ACK 等待窗口；缺省 5 秒（设计 3.3）。测试可缩短。 */
  ackTimeoutMs?: number
}

interface ToolCtx extends ExtensionContext {
  cwd: string
}

const NOTICE_WINDOW_MS = 1000

function text(text: string, isError = false): PiToolResult {
  return { content: [{ type: 'text', text }], isError }
}

function shortId(): string {
  return randomUUID().slice(0, 8)
}

/** 从 headless events.jsonl 尾部提取 agent session id（claude result / codex 线程 id）。 */
export function extractSessionId(eventsTail: string | undefined): string | undefined {
  if (!eventsTail) return undefined
  for (const line of eventsTail.split('\n').reverse()) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      if (typeof parsed.session_id === 'string') return parsed.session_id
      if (typeof parsed.thread_id === 'string') return parsed.thread_id
    } catch {
      continue
    }
  }
  return undefined
}

export function createOrchestrator(pi: BridgePi, deps: OrchestrationDeps): { dispose(): void } {
  const { adapter, registry, profiles } = deps
  let active = true
  let store: HandoffStore | undefined
  let configWarningsShown = false
  /** Pi session id 的短形式；worktree 分支名用它，session_start 时确定。 */
  let shortSession = 'session'
  let eventsHandle: { kill(): void } | undefined
  let previousTools: string[] | undefined
  let reconnectFails = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  const pendingNotices = new Map<string, string>()
  /** 各 worker 最近一次 `rex_inspect_output` 的 toolCallId；context 折叠的锚。 */
  const latestInspectCall = new Map<string, string>()
  const inspectCallToWorker = new Map<string, string>()

  const gitExec: GitExec = (args, options) => pi.exec('git', args, options)

  function notify(message: string): void {
    // 工厂作用域拿不到 ctx.ui；一次性通知走 sendMessage 的非唤醒展示面。
    safeSendMessage({ customType: 'rex-orch-notify', content: message, display: true }, { triggerTurn: false })
  }

  /** 事件环整体停摆：杀长驻子进程、清重连与聚合计时器。工具集还原由调用方决定。 */
  function stopEventLoop(): void {
    active = false
    if (noticeTimer !== undefined) clearTimeout(noticeTimer)
    noticeTimer = undefined
    if (reconnectTimer !== undefined) clearTimeout(reconnectTimer)
    reconnectTimer = undefined
    eventsHandle?.kill()
    eventsHandle = undefined
    pendingNotices.clear()
  }

  /**
   * 会话结束（quit / reload / print 模式跑完）后扩展 runtime 会整体失效，`pi.sendMessage`
   * 在 stale runtime 上直接抛异常；聚合计时器可能晚于会话结束触发，不防护会把宿主进程
   * 带崩。失效即停：这是「会话没了」而不是可重试的失败，静默停止并停摆整个事件环。
   */
  function safeSendMessage(
    message: { customType: string; content: string; display: boolean },
    options?: { triggerTurn?: boolean; deliverAs?: 'steer' | 'followUp' | 'nextTurn' }
  ): void {
    try {
      pi.sendMessage(message, options)
    } catch {
      stopEventLoop()
    }
  }

  /** 工具执行前必须已过 `session_start`；未初始化属装配错误，如实抛出。 */
  function requireStore(): HandoffStore {
    if (store === undefined) throw new Error('handoff store 尚未初始化（session_start 未发生）')
    return store
  }

  function queueNotice(workerId: string, line: string): void {
    pendingNotices.set(workerId, [pendingNotices.get(workerId) ?? '', line].filter(Boolean).join('\n'))
    if (noticeTimer !== undefined || !active) return
    noticeTimer = setTimeout(() => {
      noticeTimer = undefined
      flushNotices()
    }, NOTICE_WINDOW_MS)
  }

  /**
   * 1 秒窗口聚合后唤醒模型。逐 worker 过熔断器：fused 的只发一次性通知不 `triggerTurn`
   *（设计 3.4），窗口内唤醒过频同样熔断；熔断判定先于唤醒消息，不会既唤醒又只告警。
   */
  function flushNotices(): void {
    if (!active || pendingNotices.size === 0) return
    const wakeLines: string[] = []
    const fuseNotifications: string[] = []
    for (const [workerId, note] of pendingNotices) {
      const worker = registry.get(workerId)
      if (worker === undefined) continue
      if (worker.fused || registry.noteAutoWakeup(workerId)) {
        worker.fused = true
        fuseNotifications.push(
          `worker ${workerId} 已熔断（连续 error 或唤醒过频），自动跟进暂停，请人工检查。\n### ${workerId}\n${note}`
        )
      } else {
        wakeLines.push(`### ${workerId}\n${note}`)
      }
    }
    pendingNotices.clear()
    if (wakeLines.length > 0) {
      const content = ['<rex-orchestrator-events>', ...wakeLines, '</rex-orchestrator-events>'].join('\n')
      safeSendMessage(
        { customType: 'rex-orch-event', content, display: true },
        { triggerTurn: true, deliverAs: 'followUp' }
      )
    }
    for (const fuseNotification of fuseNotifications) {
      notify(fuseNotification)
    }
  }

  registry.subscribe({
    onTransition({ workerId, to, from }) {
      if (to === from) return
      if (to === 'done') {
        const worker = registry.get(workerId)
        queueNotice(workerId, worker ? `本轮完成（exit ${worker.exitCode ?? '?'}），请验收。` : '本轮完成。')
      } else if (to === 'error') {
        const worker = registry.get(workerId)
        queueNotice(
          workerId,
          `本轮以 error 结束（exit ${worker?.exitCode ?? '?'}${worker?.msg ? `，msg: ${worker.msg}` : ''}）。`
        )
      } else if (to === 'blocked') {
        const worker = registry.get(workerId)
        queueNotice(workerId, `blocked（${worker?.blockedKind ?? 'unknown'}），等待用户在 Rex Tab 处理。`)
      } else if (to === 'closed' && from !== 'closed') {
        queueNotice(workerId, '活跃 Block 已被关闭（用户接管或手动关闭）。')
      }
    }
  })

  function dispatchEvent(line: string): void {
    const event = parseRexEventLine(line)
    switch (event.kind) {
      case 'program_status_changed':
        for (const change of event.changes) registry.applyProgramStatus(event.blockId, change.record)
        break
      case 'program_status_removed':
        // 状态记录消失不等于 worker 消失；只作状态回退依据，不触发终态通知。
        break
      case 'child_exited':
        registry.applyChildExited(event.blockId, event.exitCode)
        break
      case 'block_closed':
        registry.applyBlockClosed(event.blockId)
        break
      default:
        break
    }
  }

  /** 断连 / `/reload` 后的全量对账：以 `rex block ls` 与逐 block 状态调用为准。 */
  async function reconcile(): Promise<void> {
    const live = new Set((await adapter.blockList()).map(block => block.blockId))
    for (const worker of registry.list()) {
      if (worker.status === 'closed') continue
      if (!live.has(worker.blockId)) {
        registry.applyBlockClosed(worker.blockId)
        continue
      }
      try {
        for (const change of await adapter.blockCallProgramStatus(worker.blockId)) {
          registry.applyProgramStatus(worker.blockId, change.record)
        }
        // `--keep-open` 的 headless Block 在子进程退出后仍存活，状态记录可能停在
        // `idle` 或残留旧值：不查 `process` 会漏掉断连期间的非零 child_exited。
        // 终态结算按 (block, turn) 幂等，多调一次不会重复计数。
        const exitCode = await adapter.blockCallLastExit(worker.blockId)
        if (exitCode !== undefined) {
          registry.applyChildExited(worker.blockId, exitCode)
        }
      } catch (error) {
        // 对账拉不到状态不是终态：保留现有状态，等事件流自己补。
        notify(`对账 ${worker.workerId} 状态失败：${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  function startEvents(): void {
    if (!active) return
    eventsHandle = adapter.startEventsStream({
      onLine: dispatchEvent,
      onExit: error => {
        eventsHandle = undefined
        if (!active) return
        if (error) reconnectFails += 1
        if (reconnectFails >= 3) {
          notify(`rex events 已连续 ${reconnectFails} 次重连失败，事件驱动跟进暂停。用 /rex-status 检查。`)
        }
        const delay = deps.reconnectDelayMs ?? 2000
        reconnectTimer = setTimeout(() => {
          reconnectTimer = undefined
          startEvents()
          if (error === undefined) reconnectFails = 0
          void reconcile().catch(() => undefined)
        }, delay)
      }
    })
  }

  function applyGuard(): void {
    const own = [
      'ask_user',
      'rex_spawn_agent',
      'rex_list_workers',
      'rex_send_input',
      'rex_inspect_output',
      'rex_inspect_changes',
      'rex_close_worker'
    ]
    // 原工具集只在第一次挂护栏时保存；`before_agent_start` 的重复挂靠不得覆盖它。
    if (previousTools === undefined) previousTools = pi.getActiveTools()
    pi.setActiveTools(guardToolList(own))
  }

  pi.on('session_start', (event: { reason?: string }, ctx: ExtensionContext) => {
    const sessionId = ctx.sessionManager.getSessionId() ?? 'default'
    if (store === undefined) store = deps.createStore(sessionId)
    shortSession = sessionId.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'session'
    if (!configWarningsShown) {
      configWarningsShown = true
      for (const warning of deps.configWarnings ?? []) notify(warning)
    }
    applyGuard()
    void reconcile().catch(() => undefined)
  })

  pi.on(
    'before_agent_start',
    (event: { systemPromptOptions?: { sections: Record<string, string>; promptGuidelines: string[] } }) => {
      // 设计 3.2：护栏在 session_start **和** before_agent_start 都挂——项目级
      // `.pi/settings.json` 可能在会话中途重新启用写工具，声明滞后一轮就靠这里补挂。
      applyGuard()
      const options = event.systemPromptOptions
      if (!options) return
      options.sections['rex-orchestrator'] = renderCoordinatorSection({
        agents: [...profiles.keys()],
        handoffRoot: HANDOFF_ROOT,
        commands: { pause: '/rex-pause', resume: '/rex-resume', status: '/rex-status', cleanup: '/rex-cleanup' }
      })
      options.promptGuidelines.push(...coordinatorGuidelines())
    }
  )

  pi.on('tool_call', (event: { toolName?: string; annotations?: { destructiveHint?: boolean } }) => {
    if (typeof event.toolName !== 'string') return
    const decision = guardToolCall(event.toolName, event.annotations)
    return decision.blocked ? { block: true, reason: decision.reason } : undefined
  })

  pi.on('context', (event: { messages?: unknown }) => {
    const messages = event.messages
    if (!Array.isArray(messages)) return
    let folded = false
    for (const message of messages) {
      if (typeof message !== 'object' || message === null) continue
      const entry = message as { role?: unknown; toolCallId?: unknown; content?: unknown }
      if (entry.role !== 'toolResult' || typeof entry.toolCallId !== 'string') continue
      const workerId = inspectCallToWorker.get(entry.toolCallId)
      if (workerId === undefined) continue
      if (latestInspectCall.get(workerId) === entry.toolCallId) continue
      const content = entry.content
      if (!Array.isArray(content) || content.length === 0) continue
      entry.content = [
        { type: 'text', text: '[已折叠：该轮 rex_inspect_output 输出已被更新的验收取代，需要原文时重新调用。]' }
      ]
      folded = true
    }
    return folded ? { messages: messages as never } : undefined
  })

  pi.on('session_shutdown', () => {
    // 会话结束即整体停摆：聚合计时器与事件环在 stale runtime 上继续跑会抛异常带崩宿主。
    stopEventLoop()
    if (previousTools !== undefined) {
      pi.setActiveTools(previousTools)
      previousTools = undefined
    }
  })

  // ---------------------------------------------------------------- tools

  pi.registerTool({
    name: 'ask_user',
    label: 'Ask User',
    description:
      'Show the user a popup question and return their choice. Use it whenever the agent profile, run mode, or worktree policy for a worker is unspecified, or before any risky cleanup.',
    exposure: 'model-only',
    executionMode: 'sequential',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question text shown in the dialog title area.' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Selectable choices; first is highlighted as recommended.'
        },
        recommended: { type: 'string', description: 'Which option text to mark as recommended.' }
      },
      required: ['question'],
      additionalProperties: false
    },
    async execute(
      _id,
      params: { question: string; options?: string[]; recommended?: string },
      _signal,
      _onUpdate,
      ctx: ToolCtx
    ) {
      const options = params.options?.filter(option => option.trim() !== '') ?? []
      if (options.length === 0) {
        const ok = await ctx.ui.confirm(params.question, '确认该操作？')
        return text(ok ? '用户确认。' : '用户取消。', !ok)
      }
      if (!ctx.hasUI) {
        return text('当前会话没有弹窗 UI：请把问题直接写进对话向用户提问。', true)
      }
      const ordered = params.recommended
        ? [params.recommended, ...options.filter(option => option !== params.recommended)]
        : options
      const choice = await ctx.ui.select(params.question, ordered)
      return text(choice === undefined ? '用户未作选择（弹窗被关闭）。' : `用户选择：${choice}`, choice === undefined)
    }
  })

  pi.registerTool({
    name: 'rex_spawn_agent',
    label: 'Rex Spawn Agent',
    description:
      'Spawn a worker agent in a new Rex terminal block from the profile whitelist. The long task text is written to turn-001.brief.md in the worker handoff directory and only a short pointer prompt is sent. Modes: interactive (TUI block, user can take over anytime) or headless (JSONL captured to disk, no TUI).',
    exposure: 'model-only',
    executionMode: 'sequential',
    promptSnippet: 'Spawn a whitelisted worker agent in a Rex block',
    parameters: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Profile name from the whitelist.' },
        task: { type: 'string', description: 'Full task instructions; written to turn-001.brief.md verbatim.' },
        mode: { type: 'string', enum: ['interactive', 'headless'], description: 'Default: interactive.' },
        label: { type: 'string', description: 'Rex block label; defaults to the worker id.' },
        use_worktree: {
          type: 'boolean',
          description: 'Create an isolated git worktree; only offered when HEAD exists.'
        }
      },
      required: ['agent', 'task'],
      additionalProperties: false
    },
    async execute(
      _id,
      params: { agent: string; task: string; mode?: string; label?: string; use_worktree?: boolean },
      _signal,
      _onUpdate,
      ctx: ToolCtx
    ) {
      const profile = profiles.get(params.agent)
      if (!profile) {
        return text(`未知 agent "${params.agent}"。可用 profile：${[...profiles.keys()].join('、')}`, true)
      }
      const store = requireStore()
      const mode = params.mode === 'headless' ? 'headless' : 'interactive'
      const targetCwd = ctx.cwd
      const snapshot = await snapshotBase(gitExec, targetCwd).catch(error => {
        throw new Error(
          `读取 git 基线失败（${error instanceof Error ? error.message : String(error)}），请在 git 仓库内派生`
        )
      })

      const workerId = `${profile.name}-${shortId()}`
      const label = params.label !== undefined && params.label.trim() !== '' ? params.label : workerId

      // 可执行先解析再建 worktree：binary 拼错时不能留下无 registry 记录、
      // 也没有人负责清理的孤儿 worktree 和 pi-orch/* 分支。
      const binary = await resolveExecutable(profile.binary, resolveDeps())
      if (!binary) {
        return text(`找不到 profile "${profile.name}" 的可执行文件 ${profile.binary}，worker 未派生。`, true)
      }

      let worktree: { path: string; branch: string } | undefined
      let workerCwd = targetCwd
      let useWorktree = params.use_worktree
      if (useWorktree === undefined && snapshot.baseCommit !== null) {
        const busyPeer = registry.list().find(worker => worker.cwd === targetCwd && worker.status !== 'closed')
        if (busyPeer !== undefined) {
          const note = [worktreeDirtyNote(snapshot.dirty), `已有活跃 worker ${busyPeer.workerId} 使用同一目录。`]
            .filter(Boolean)
            .join('\n')
          useWorktree = await ctx.ui.confirm(
            '为新 Worker 创建独立 git worktree？',
            `${note}\n推荐创建，避免两个 worker 写同一工作区。`
          )
        }
      }
      if (useWorktree === true) {
        if (snapshot.baseCommit === null) {
          return text('零提交仓库没有 HEAD，无法创建 Worktree；请改用共享目录模式。', true)
        }
        const branch = worktreeBranch(shortSession, workerId)
        const path = store.worktreeDir(workerId)
        await createWorktree(gitExec, { mainCwd: targetCwd, path, branch })
        worktree = { path, branch }
        workerCwd = path
        if (deps.config?.worktreeSetupHook) {
          const hook = await pi.exec('/bin/sh', ['-c', deps.config.worktreeSetupHook], { cwd: workerCwd })
          if (hook.code !== 0) {
            notify(`worktreeSetupHook 失败（exit ${hook.code}）：${hook.stderr.slice(0, 200)}`)
          }
        }
      }

      const { dir: handoffDir, warnings } = await store.ensureWorkerDir(workerId)
      const ignoredDeps = worktree ? await scanIgnoredDeps({ exists: path => existsPath(pi, path) }, worktree.path) : []

      const brief = renderBrief({
        turn: 1,
        task: params.task,
        workerId,
        worktree,
        mainCwd: targetCwd,
        ignoredDeps,
        handoffPath: store.handoffPath(workerId, 1)
      })
      await store.writeBrief(workerId, 1, brief)

      const shortPrompt =
        `Read ${store.briefPath(workerId, 1)} and execute it now. ` +
        `When done, write a structured conclusion to ${store.handoffPath(workerId, 1)}.`
      const launchCtx = { cwd: workerCwd, handoffDir, prompt: shortPrompt }

      let commandSegments: string[]
      if (mode === 'headless') {
        // extraArgs 已由 resolveProfiles 包进模板，这里再追加就是重复传参。
        const args = profile.headlessArgs(launchCtx)
        const eventsOut = store.eventsPath(workerId, 1)
        commandSegments = [
          '/usr/bin/env',
          'PI_REX_ORCH=0',
          deps.nodePath,
          deps.runHeadlessPath,
          '--events-out',
          eventsOut,
          '--',
          binary,
          ...args
        ]
      } else {
        const args = profile.interactiveArgs(launchCtx)
        commandSegments = ['/usr/bin/env', 'PI_REX_ORCH=0', binary, ...args]
      }

      const dangerWarnings = auditProfileArgs(profile, commandSegments)
      for (const warning of [...dangerWarnings, ...warnings]) notify(warning)

      let created: Awaited<ReturnType<RexAdapter['runBlock']>>
      try {
        created = await adapter.runBlock({
          cwd: workerCwd,
          label,
          keepOpen: mode === 'headless',
          focus: mode === 'interactive',
          commandSegments
        })
      } catch (error) {
        const failure = error instanceof Error ? error.message : String(error)
        // 无 worktree：没有残留资源，直接把失败如实交给宿主。
        if (worktree === undefined) throw error
        // runBlock 失败时 Rex 可能已创建 Block（超时 / JSON 截断），而 Block 与失败
        // 请求之间没有任何可证明的关联——按 label 接管可能认领别人的 Block，按列表
        // 判定「未创建」也可能与创建竞态。一律保守：不接管、不回滚，登记一个
        // blockId 为 `unconfirmed:` 前缀的 placeholder（永远不匹配真实事件），让
        // rex_list_workers 与 /rex-cleanup 都看得见这份残留，由用户在 Rex Tab 确认。
        registry.register(
          {
            workerId,
            agent: profile.name,
            mode,
            label,
            blockId: `unconfirmed:${workerId}`,
            turn: 1,
            cwd: workerCwd,
            baseCommit: snapshot.baseCommit,
            baseDirty: snapshot.dirty,
            worktree,
            mainCwd: targetCwd,
            paused: false
          },
          { initialStatus: 'closed' }
        )
        return text(
          [
            `rex run 返回异常（${failure}），派生结果不明：请在 Rex Tab 检查 label=${label}。`,
            `worker ${workerId} 已按「未确认」登记，worktree 保留：${worktree.path}（branch ${worktree.branch}）。`,
            `brief：${store.briefPath(workerId, 1)}`,
            '若 Block 在跑就让它完成并人工验收；若确认未派生，用 /rex-cleanup 清理该 worktree。'
          ].join('\n'),
          true
        )
      }
      const blockId = created.blockIds[0] as string
      registry.register({
        workerId,
        agent: profile.name,
        mode,
        label,
        blockId,
        turn: 1,
        cwd: workerCwd,
        baseCommit: snapshot.baseCommit,
        baseDirty: snapshot.dirty,
        worktree,
        mainCwd: worktree === undefined ? undefined : targetCwd,
        paused: false
      })

      return text(
        [
          `worker ${workerId}（${profile.name}，${mode}）已派生。`,
          `Rex Tab：label=${label}，window=${created.windowId}。`,
          `brief：${store.briefPath(workerId, 1)}`,
          worktree ? `worktree：${worktree.path}（branch ${worktree.branch}）` : `工作区：共享目录 ${workerCwd}`
        ].join('\n')
      )
    }
  })

  pi.registerTool({
    name: 'rex_list_workers',
    label: 'Rex List Workers',
    description: 'List all workers owned by this coordinator session with their status, mode, block, and worktree.',
    exposure: 'model-only',
    executionMode: 'parallel',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    async execute(): Promise<PiToolResult> {
      const workers = registry.list()
      if (workers.length === 0) return text('当前没有 worker。')
      const rows = workers.map(worker =>
        [
          `- ${worker.workerId} [${worker.agent}/${worker.mode}] ${worker.status}${worker.paused ? '（paused）' : ''}`,
          `  turn=${worker.turn} block=${worker.blockId}${worker.retiredBlockIds.length > 0 ? `（retired ${worker.retiredBlockIds.length}）` : ''}`,
          worker.worktree
            ? `  worktree=${worker.worktree.path} branch=${worker.worktree.branch}`
            : `  cwd=${worker.cwd}`
        ].join('\n')
      )
      return text(rows.join('\n'))
    }
  })

  pi.registerTool({
    name: 'rex_send_input',
    label: 'Rex Send Input',
    description:
      'Send a follow-up turn to a worker. The instruction is written to turn-NNN.brief.md and a short pointer prompt is delivered. Interactive workers get the prompt into their TUI with a state-transition ACK; headless workers get a fresh resumed headless run in a new block (old block is retired).',
    exposure: 'model-only',
    executionMode: 'sequential',
    parameters: {
      type: 'object',
      properties: {
        worker_id: { type: 'string' },
        instruction: { type: 'string', description: 'Full follow-up instructions; written to the next turn brief.' }
      },
      required: ['worker_id', 'instruction'],
      additionalProperties: false
    },
    async execute(_id, params: { worker_id: string; instruction: string }, _signal, _onUpdate, ctx: ToolCtx) {
      const worker = registry.get(params.worker_id)
      if (!worker) return text(`未知 worker "${params.worker_id}"。`, true)

      const gate = registry.canAutoDeliver(params.worker_id)
      if (!gate.allowed) {
        if (!ctx.hasUI) {
          return text(`无法静默投递：${gate.reason}。请向用户说明并征得同意后再试。`, true)
        }
        const ok = await ctx.ui.confirm(
          `向 worker ${worker.workerId} 投递新指令？`,
          `当前状态：${worker.status}${worker.paused ? '（已暂停保护）' : ''}。\n拒绝原因：${gate.reason}\n拟发送：\n${params.instruction.slice(0, 300)}`
        )
        if (!ok) return text('用户拒绝投递。', true)
      }

      const profile = profiles.get(worker.agent)
      if (!profile) return text(`worker 的 profile "${worker.agent}" 已不可用。`, true)
      const store = requireStore()

      const turn = worker.turn + 1
      const brief = renderBrief({
        turn,
        task: params.instruction,
        workerId: worker.workerId,
        worktree: worker.worktree,
        // worktree worker 的主仓是 mainCwd；cwd 是 worktree 自身，写反会把续跑指令
        // 的「主仓库」指到 worktree 路径上。
        mainCwd: worker.mainCwd ?? worker.cwd,
        ignoredDeps: [],
        handoffPath: store.handoffPath(worker.workerId, turn)
      })
      await store.writeBrief(worker.workerId, turn, brief)
      const shortPrompt =
        `Read ${store.briefPath(worker.workerId, turn)} and execute it now. ` +
        `When done, write a structured conclusion to ${store.handoffPath(worker.workerId, turn)}.`

      if (worker.mode === 'headless') {
        // 全文扫描而不是只看尾部：codex 的 thread 记录在首行，长任务的尾部没有它。
        const agentSessionId =
          worker.agentSessionId ?? extractSessionId(await store.readEvents(worker.workerId, worker.turn))
        if (agentSessionId === undefined) {
          return text(
            `找不到 worker ${worker.workerId} 的 agent session id（events.jsonl 无 session/thread 记录），无法 headless 续跑。` +
              '先 rex_inspect_output 查看输出。',
            true
          )
        }
        registry.setAgentSessionId(worker.workerId, agentSessionId)
        const launchCtx = {
          cwd: worker.cwd,
          handoffDir: store.workerDir(worker.workerId),
          prompt: shortPrompt,
          sessionId: agentSessionId
        }
        const args = profile.headlessResumeArgs(launchCtx, agentSessionId)
        const created = await adapter.runBlock({
          cwd: worker.cwd,
          label: worker.label,
          keepOpen: true,
          focus: false,
          commandSegments: [
            '/usr/bin/env',
            'PI_REX_ORCH=0',
            deps.nodePath,
            deps.runHeadlessPath,
            '--events-out',
            store.eventsPath(worker.workerId, turn),
            '--',
            await resolveExecutableOrThrow(profile),
            ...args
          ]
        })
        registry.replaceBlock(worker.workerId, created.blockIds[0] as string)
        registry.markTurnDispatched(worker.workerId, turn)
        return text(
          [
            `headless 续跑已启动（turn ${turn}，session ${agentSessionId}）。`,
            `旧 Block 已回收进 retired 列表；新 Block：${created.blockIds[0]}。`,
            `brief：${store.briefPath(worker.workerId, turn)}`
          ].join('\n')
        )
      }

      // ACK 监听先注册再投递：等的是 worker 真实 OSC 跃迁，不能被自家动作抢先。
      const ackPromise = profile.supportsOsc7501
        ? waitForTransition(worker.workerId, deps.ackTimeoutMs ?? 5000)
        : Promise.resolve<boolean | undefined>(undefined)

      await adapter.send(worker.blockId, shortPrompt)
      await adapter.sendKey(worker.blockId, 'enter')
      registry.markTurnDispatched(worker.workerId, turn, { notifyTransition: false })

      let ackNote = '（profile 不支持 OSC 7501，跳过送达强校验）'
      if (profile.supportsOsc7501) {
        const transitioned = await ackPromise
        if (transitioned) {
          ackNote = '送达确认：worker 状态发生跃迁。'
        } else {
          const tail = await adapter.capture(worker.blockId, 30).catch(() => undefined)
          ackNote = `5 秒内未观察到状态跃迁，可能卡在弹窗或未提交。屏幕尾部诊断：\n${(tail ?? '(capture 失败，需人工查看)').split('\n').slice(-10).join('\n')}`
        }
      }
      return text([`已向 ${worker.workerId} 投递 turn ${turn}。`, ackNote].join('\n'))
    }
  })

  pi.registerTool({
    name: 'rex_inspect_output',
    label: 'Rex Inspect Output',
    description:
      'Inspect a worker latest output. Prefers the turn handoff file; falls back to the headless events.jsonl tail (headless) or a captured screen tail (interactive), never stale files from earlier turns.',
    exposure: 'model-only',
    executionMode: 'parallel',
    parameters: {
      type: 'object',
      properties: {
        worker_id: { type: 'string' },
        tail_lines: { type: 'number', description: 'Maximum tail lines for the fallback view. Default: 40.' }
      },
      required: ['worker_id'],
      additionalProperties: false
    },
    async execute(
      toolCallId: string,
      params: { worker_id: string; tail_lines?: number },
      _signal,
      _onUpdate,
      _ctx: ToolCtx
    ) {
      const worker = registry.get(params.worker_id)
      if (!worker) return text(`未知 worker "${params.worker_id}"。`, true)
      const store = requireStore()
      const tailLines = params.tail_lines ?? 40

      const handoff = await store.readHandoff(worker.workerId, worker.turn)
      const sections: string[] = [`worker ${worker.workerId}：status=${worker.status}，turn=${worker.turn}`]

      if (handoff.status === 'ok') {
        sections.push(`## turn-${worker.turn} handoff\n${handoff.content}`)
      } else if (worker.mode === 'headless') {
        const eventsTail = await store.readEventsTail(worker.workerId, worker.turn, tailLines)
        sections.push(
          eventsTail === undefined
            ? `## events.jsonl\n（turn-${worker.turn} 无事件落盘）`
            : `## events.jsonl 尾部\n${eventsTail}`
        )
      } else {
        const screen = await adapter.capture(worker.blockId, tailLines).catch(error => `capture 失败：${String(error)}`)
        await store.writeCaptureLog(worker.workerId, screen).catch(() => undefined)
        sections.push(`## 屏幕尾部\n${screen}`)
      }

      latestInspectCall.set(worker.workerId, toolCallId)
      inspectCallToWorker.set(toolCallId, worker.workerId)
      return text(sections.join('\n\n'))
    }
  })

  pi.registerTool({
    name: 'rex_inspect_changes',
    label: 'Rex Inspect Changes',
    description:
      'Full read-only acceptance diff of a worker workspace against its dispatch-time base commit: commit list, tracked diff stat, optional single-path diff, and previews of newly created untracked text files.',
    exposure: 'model-only',
    executionMode: 'parallel',
    parameters: {
      type: 'object',
      properties: {
        worker_id: { type: 'string' },
        path: { type: 'string', description: 'Optional path filter for a detailed diff.' }
      },
      required: ['worker_id'],
      additionalProperties: false
    },
    async execute(toolCallId: string, params: { worker_id: string; path?: string }) {
      const worker = registry.get(params.worker_id)
      if (!worker) return text(`未知 worker "${params.worker_id}"。`, true)
      const report = await inspectChanges(
        gitExec,
        {
          readFile: async filePath => {
            const result = await pi.exec('/bin/cat', [filePath])
            if (result.code !== 0) throw new Error(result.stderr)
            return result.stdout
          }
        },
        worker.cwd,
        { baseCommit: worker.baseCommit, dirty: worker.baseDirty },
        { path: params.path }
      )
      latestInspectCall.set(worker.workerId, toolCallId)
      inspectCallToWorker.set(toolCallId, worker.workerId)
      return text(report)
    }
  })

  pi.registerTool({
    name: 'rex_close_worker',
    label: 'Rex Close Worker',
    description:
      'Close a worker: close its blocks, then clean its worktree only when it is clean AND merged; otherwise keep it and report the exact merge command. Pass force: true to drop an unmerged branch with git branch -D after user consent.',
    exposure: 'model-only',
    executionMode: 'sequential',
    parameters: {
      type: 'object',
      properties: {
        worker_id: { type: 'string' },
        force: {
          type: 'boolean',
          description: 'Allow git branch -D for an unmerged branch. Still refuses a dirty worktree.'
        }
      },
      required: ['worker_id'],
      additionalProperties: false
    },
    async execute(_id, params: { worker_id: string; force?: boolean }, _signal, _onUpdate, ctx: ToolCtx) {
      const worker = registry.get(params.worker_id)
      if (!worker) return text(`未知 worker "${params.worker_id}"。`, true)

      // 派生结果不明的 placeholder：真实 Block 可能在 Rex 里运行，而它的全新
      // worktree「干净且无独立提交」——非 force 清理会命中 clean+merged 判定，把
      // 可能正被使用的 worktree 删掉。必须过用户显式确认，无 UI 就保留。
      const unconfirmed = worker.blockId.startsWith('unconfirmed:')
      if (unconfirmed && worker.worktree) {
        if (!ctx.hasUI) {
          return text(
            [
              `worker ${worker.workerId} 的派生结果不明（blockId=${worker.blockId}）。`,
              '当前会话没有弹窗 UI，不能安全清理；worktree 保留：',
              `${worker.worktree.path}（branch ${worker.worktree.branch}）。`,
              '请先在 Rex Tab 确认没有该 label 的 Block 在跑，再在有 UI 的会话里清理。'
            ].join('\n'),
            true
          )
        }
        const confirmed = await ctx.ui.confirm(
          `清理未确认 worker ${worker.workerId} 的 worktree？`,
          '该 worker 的 rex run 曾返回异常：请先确认 Rex Tab 里没有对应 label 的 Block 在运行。' +
            '确认后执行 git worktree remove + git branch -D，未提交工作不可找回。'
        )
        if (!confirmed) {
          return text(
            [
              `用户拒绝清理，worker ${worker.workerId} 保持原状。`,
              `worktree：${worker.worktree.path}（branch ${worker.worktree.branch}）` +
                '——确认 Rex Tab 后重试 rex_close_worker。'
            ].join('\n'),
            true
          )
        }
      }

      if (params.force === true && !ctx.hasUI) {
        return text('force 关闭需要弹窗确认，当前会话没有 UI。请先征得用户同意。', true)
      }
      if (params.force === true) {
        const ok = await ctx.ui.confirm(
          '放弃未合并分支？',
          `${worker.worktree?.branch ?? worker.workerId} 尚未合并进主仓 HEAD；force 将执行 git branch -D，未提交工作不可找回。`
        )
        if (!ok) return text('用户拒绝 force，worker 保持原状。', true)
      }

      const closeErrors: string[] = []
      for (const blockId of [worker.blockId, ...worker.retiredBlockIds]) {
        // 合成 blockId（unconfirmed: 前缀）不指向真实 Block，关它只会得到必然失败的调用。
        if (blockId.startsWith('unconfirmed:')) continue
        await adapter.blockClose(blockId).catch(error => {
          closeErrors.push(`block ${blockId}: ${error instanceof Error ? error.message : String(error)}`)
        })
      }

      let cleanupNote = '（无 worktree）'
      if (worker.worktree) {
        const mainCwd = worker.mainCwd ?? (await findMainRepo(gitExec, worker.cwd).catch(() => worker.cwd))
        const outcome = await cleanupWorktree(
          gitExec,
          { mainCwd, path: worker.worktree.path, branch: worker.worktree.branch },
          { force: unconfirmed || params.force === true }
        )
        cleanupNote =
          outcome.kind === 'removed'
            ? `worktree 与分支 ${outcome.branch} 已清理。`
            : [
                `worktree 保留：${outcome.reason}`,
                `路径：${outcome.path}`,
                `合回命令（在主仓执行）：${outcome.mergeHint}`
              ].join('\n')
      }

      registry.markClosed(worker.workerId)
      const errorNote = closeErrors.length > 0 ? `\n关闭警告：\n${closeErrors.join('\n')}` : ''
      return text([`worker ${worker.workerId} 已关闭。`, cleanupNote].join('\n') + errorNote)
    }
  })

  // ---------------------------------------------------------------- commands

  pi.registerCommand('rex-status', {
    description: '查看事件流健康度、活跃 worker、交接区路径',
    async handler(_args, ctx) {
      const workers = registry.list()
      const lines = [
        `事件流：${eventsHandle === undefined ? '未连接' : '已连接'}（连续重连失败 ${reconnectFails} 次）`,
        `交接区：${store === undefined ? '（session 未初始化）' : store.root}`,
        workers.length === 0
          ? 'worker：无'
          : workers
              .map(w => `- ${w.workerId} [${w.agent}/${w.mode}] ${w.status}${w.paused ? ' paused' : ''} turn=${w.turn}`)
              .join('\n')
      ]
      pi.sendMessage({ customType: 'rex-orch-info', content: lines.join('\n'), display: true }, { triggerTurn: false })
      void ctx
    }
  })

  pi.registerCommand('rex-pause', {
    description: '开启 worker 的人工接管保护（args: worker id）',
    async handler(args, ctx) {
      const workerId = args.trim()
      if (!registry.setPaused(workerId, true)) {
        ctx.ui.notify(`没有 worker "${workerId}"`, 'warning')
        return
      }
      ctx.ui.notify(`${workerId} 已进入人工接管保护，自动投递暂停`, 'info')
    }
  })

  pi.registerCommand('rex-resume', {
    description: '解除 worker 的人工接管保护（args: worker id）',
    async handler(args, ctx) {
      const workerId = args.trim()
      if (!registry.setPaused(workerId, false)) {
        ctx.ui.notify(`没有 worker "${workerId}"`, 'warning')
        return
      }
      ctx.ui.notify(`${workerId} 已解除接管保护`, 'info')
    }
  })

  pi.registerCommand('rex-cleanup', {
    description: '回收已结束 worker 的残留 Block 与已合并 / 确认废弃的 worktree',
    async handler(_args, ctx) {
      if (!ctx.hasUI) {
        ctx.ui.notify('请在有弹窗 UI 的会话里执行 /rex-cleanup', 'warning')
        return
      }
      const candidates = registry
        .list()
        .filter(worker => worker.status === 'closed' || worker.retiredBlockIds.length > 0)
      if (candidates.length === 0) {
        ctx.ui.notify('没有需要回收的 worker', 'info')
        return
      }
      for (const worker of candidates) {
        const unconfirmed = worker.blockId.startsWith('unconfirmed:')
        const ok = await ctx.ui.confirm(
          `回收 ${worker.workerId} 的残留资源？`,
          unconfirmed
            ? '该 worker 派生结果不明：请先确认 Rex Tab 里没有对应 label 的 Block 在运行。确认后强制清理其 worktree 与分支。'
            : '将关闭其 retired Block；worktree 按已合并/干净与否自动处理或保留。'
        )
        if (!ok) continue
        for (const blockId of worker.retiredBlockIds) {
          await adapter.blockClose(blockId).catch(() => undefined)
        }
        worker.retiredBlockIds.length = 0
        if (worker.worktree && worker.status === 'closed') {
          // 清理命令要在主仓执行：worker.cwd 是即将被删除的 worktree 本身。
          const mainCwd = worker.mainCwd ?? (await findMainRepo(gitExec, worker.cwd).catch(() => worker.cwd))
          const outcome = await cleanupWorktree(
            gitExec,
            {
              mainCwd,
              path: worker.worktree.path,
              branch: worker.worktree.branch
            },
            // placeholder 的全新 worktree「干净且无独立提交」，非 force 会命中
            // clean+merged 判定误删可能正被使用的 worktree；用户已确认才 force。
            { force: unconfirmed }
          ).catch(error => ({
            kind: 'kept' as const,
            reason: String(error),
            path: worker.worktree?.path ?? '',
            branch: worker.worktree?.branch ?? '',
            mergeHint: mergeHint(worker.worktree?.branch ?? '')
          }))
          ctx.ui.notify(
            outcome.kind === 'removed'
              ? `${worker.workerId} worktree 已清理`
              : `${worker.workerId} worktree 保留：${outcome.reason}`,
            outcome.kind === 'removed' ? 'info' : 'warning'
          )
        }
      }
    }
  })

  startEvents()

  return {
    dispose() {
      stopEventLoop()
      if (previousTools !== undefined) pi.setActiveTools(previousTools)
    }
  }

  // ---------------------------------------------------------------- helpers

  async function resolveExecutableOrThrow(profile: AgentProfile): Promise<string> {
    const binary = await resolveExecutable(profile.binary, resolveDeps())
    if (!binary) throw new Error(`找不到可执行文件 ${profile.binary}`)
    return binary
  }

  /** 可执行解析的依赖注入：which 走 login shell 环境，test -f 判绝对路径。 */
  function resolveDeps() {
    return {
      exec: (command: string, args: string[], options?: { cwd?: string }) => pi.exec(command, args, options),
      fileExists: async (filePath: string) => (await pi.exec('/usr/bin/test', ['-f', filePath])).code === 0
    }
  }

  /** 等待 worker 的下一次状态跃迁；观察先注册再放行超时，超时返回 false。 */
  async function waitForTransition(workerId: string, timeoutMs: number): Promise<boolean> {
    return new Promise(resolve => {
      let settled = false
      const unsubscribe = registry.subscribe({
        onTransition(transition) {
          if (transition.workerId === workerId) finish(true)
        }
      })
      const timer = setTimeout(() => finish(false), timeoutMs)
      function finish(ok: boolean): void {
        if (settled) return
        settled = true
        clearTimeout(timer)
        unsubscribe()
        resolve(ok)
      }
    })
  }
}

function renderBrief(input: {
  turn: number
  task: string
  workerId: string
  worktree?: { path: string; branch: string }
  mainCwd: string
  ignoredDeps: string[]
  handoffPath: string
}): string {
  const lines = [
    `# turn-${String(input.turn).padStart(3, '0')} 任务说明`,
    '',
    input.task,
    '',
    '## 上下文边界',
    input.worktree
      ? [
          `- 你在独立 git worktree：${input.worktree.path}（branch ${input.worktree.branch}）。`,
          `- 主仓库：${input.mainCwd}。worktree 基于 HEAD 检出，不含主目录未提交改动。`,
          input.ignoredDeps.length > 0
            ? `- 主仓库存在被忽略的依赖/配置：${input.ignoredDeps.join('、')}；worktree 里不存在，按需重建或从主仓库取。`
            : ''
        ].join('\n')
      : `- 工作目录：${input.mainCwd}（与其他会话共享，改动前先确认没有冲突）。`,
    '',
    '## 交付',
    `完成后把结构化结论写入 ${input.handoffPath}：包含做了什么、改了哪些路径、验证方式与结果、未尽事项。`
  ]
  return lines.join('\n')
}

function existsPath(pi: BridgePi, filePath: string): Promise<boolean> {
  // `-e` 而非 `-f`：node_modules / .venv 是目录，`-f` 会漏报。
  return pi.exec('/usr/bin/test', ['-e', filePath]).then(result => result.code === 0)
}

/** worktree 的主仓 cwd：从 worktree 里问 git 一次。 */
async function findMainRepo(gitExec: GitExec, cwd: string): Promise<string> {
  return (await runGit(gitExec, cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).replace(
    /\/\.git$/,
    ''
  )
}
