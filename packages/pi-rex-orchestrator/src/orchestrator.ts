/**
 * 协调者装配层：把注册表、rex 适配、交接区与护栏接到 Pi 的钩子与工具面上。
 *
 * 时序约定（与 Pi 宿主的真实契约对齐，见 `pi-types.ts`）：
 *
 * - `session_start`：挂工具白名单、启动事件环并做一次全量对账。
 * - `before_agent_start`：写结构化 `systemPromptOptions.sections`，不覆盖整段 prompt。
 * - `tool_call`：硬拦写工具与 destructiveHint MCP 工具。
 * - `context`：折叠被更新验收取代的旧 `rex_inspect_output` 输出。
 * - 事件环的终态通知经 `event-coordinator.ts` 按 1 秒窗口聚合后非阻塞唤醒，熔断后降级为
 *   一次性通知；派生/投递/验收委托给 `worker-lifecycle.ts`；收尾与 worktree 清理交由
 *   `worker-teardown.ts` 处理。
 *
 * 真实的 rex 子进程只在入口（`index.ts`）注入；本模块的控制依赖全部可注入，测试与
 * 直接装配不会动到真实会话。
 */

import { basename } from 'node:path'

import { createEventCoordinator } from './event-coordinator'
import type { GitExec } from './git-inspector'
import { guardToolCall, guardToolList } from './guard'
import type { HandoffStore } from './handoff-store'
import { HANDOFF_ROOT } from './handoff-store'
import type { ExtensionContext, PiExecOptions, PiToolDefinition, PiToolResult } from './pi-types'
import type { AgentProfile, RexOrchestratorConfig } from './profiles'
import { coordinatorGuidelines, renderCoordinatorSection, renderWelcome } from './prompt'
import type { RexAdapter } from './rex-adapter'
import { DEFAULT_WORKER_AGENT_BINARIES, executeRexCli } from './rex-cli'
import type { WorkerRegistry } from './state-machine'
import { createWorkerLifecycle } from './worker-lifecycle'
import { cleanupWorkers, closeWorker } from './worker-teardown'

export { extractSessionId } from './worker-lifecycle'

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
    options?: PiExecOptions
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
  /** rex_cli 使用的可执行与激活时目标 session。 */
  rexBin: string
  rexSession: string
  /** 事件环重连的基准延迟。 */
  reconnectDelayMs?: number
  /** interactive 投递的 Send-ACK 等待窗口；缺省 5 秒（设计 3.3）。测试可缩短。 */
  ackTimeoutMs?: number
  /** 激活时给用户发一条友好欢迎/速查提示；缺省开。 */
  showWelcome?: boolean
  /**
   * 列出交接区根目录下全部 session 目录名；缺省不扫。崩溃/断网的旧会话残留
   * （含可能未合并的 worktree）不能自动删——但激活时提醒一次，别让用户永远不知道。
   */
  listHandoffSessions?: () => Promise<readonly string[]>
}

interface ToolCtx extends ExtensionContext {
  cwd: string
}

function text(content: string, isError = false): PiToolResult {
  return { content: [{ type: 'text', text: content }], isError }
}

/** profile binary 统一按 basename 纳入路由护栏；损坏或空值降级跳过，不能阻断激活。 */
function workerAgentBinaries(profiles: ReadonlyMap<string, AgentProfile>): ReadonlySet<string> {
  const binaries = new Set(DEFAULT_WORKER_AGENT_BINARIES)
  for (const profile of profiles.values()) {
    try {
      if (typeof profile.binary !== 'string') continue
      const binary = profile.binary.trim()
      if (binary === '') continue
      const name = basename(binary)
      if (name !== '') binaries.add(name)
    } catch {
      continue
    }
  }
  return binaries
}

export function createOrchestrator(pi: BridgePi, deps: OrchestrationDeps): { dispose(): void } {
  const { adapter, registry, profiles } = deps
  const rexCliWorkerAgentBinaries = workerAgentBinaries(profiles)
  let store: HandoffStore | undefined
  let registryRestored = false
  let persistWarned = false
  let configWarningsShown = false
  /** Pi session id 的短形式；worktree 分支名用它，session_start 时确定。 */
  let shortSession = 'session'
  let previousTools: string[] | undefined
  /** 各 worker 最近一次 `rex_inspect_output` / `rex_inspect_changes` 的 toolCallId；context 折叠的锚。 */
  const latestInspectCall = new Map<string, string>()
  const inspectCallToWorker = new Map<string, string>()

  const gitExec: GitExec = (args, { cwd }) => pi.exec('git', args, { cwd })

  const events = createEventCoordinator({
    adapter,
    registry,
    reconnectDelayMs: deps.reconnectDelayMs,
    sendMessage: (message, options) => pi.sendMessage(message, options)
  })

  /** 把 worker 注册表落盘：/reload 或会话恢复据此重建跟踪。失败只告警一次。 */
  function persistRegistry(): void {
    if (store === undefined) return
    void store.saveRegistry(registry.list()).catch(error => {
      if (persistWarned) return
      persistWarned = true
      events.notify(
        `worker 注册表持久化失败：${error instanceof Error ? error.message : String(error)}（/reload 后将丢失 worker 跟踪）`
      )
    })
  }

  /** 工具执行前必须已过 `session_start`；未初始化属装配错误，如实抛出。 */
  function requireStore(): HandoffStore {
    if (store === undefined) throw new Error('handoff store 尚未初始化（session_start 未发生）')
    return store
  }

  const lifecycle = createWorkerLifecycle({
    adapter,
    registry,
    profiles,
    requireStore,
    getShortSession: () => shortSession,
    gitExec,
    exec: (command, args, options) => pi.exec(command, args, options),
    persistRegistry,
    reconcile: () => events.reconcile(),
    notify: message => events.notify(message),
    options: {
      runHeadlessPath: deps.runHeadlessPath,
      nodePath: deps.nodePath,
      worktreeSetupHook: deps.config?.worktreeSetupHook,
      ackTimeoutMs: deps.ackTimeoutMs
    }
  })

  function applyGuard(): void {
    const own = [
      'ask_user',
      'rex_cli',
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

  pi.on('session_start', (_event: { reason?: string }, ctx: ExtensionContext) => {
    const sessionId = ctx.sessionManager.getSessionId() ?? 'default'
    if (store === undefined) store = deps.createStore(sessionId)
    shortSession = sessionId.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'session'
    if (!configWarningsShown) {
      configWarningsShown = true
      for (const warning of deps.configWarnings ?? []) events.notify(warning)
      if (deps.showWelcome !== false) {
        events.safeSendMessage({ customType: 'rex-orch-welcome', content: renderWelcome(), display: true })
      }
      // 崩溃/断网留下的旧会话交接区不自动删（可能有未合并 worktree），但提醒一次。
      if (deps.listHandoffSessions !== undefined) {
        void deps
          .listHandoffSessions()
          .then(sessions => {
            // 延后回调先查 active：会话已结束时不得再触碰宿主 runtime。
            if (!events.isActive()) return
            const stale = sessions.filter(name => name !== sessionId && name !== 'default')
            if (stale.length === 0) return
            events.notify(
              `交接区根目录下有 ${stale.length} 个其他会话的目录（${stale.slice(0, 3).join('、')}${stale.length > 3 ? ' 等' : ''}）。` +
                '可能是历史残留，也可能属于另一个正在运行的会话——删之前先确认没有别的 pi/Rex 会话在用；' +
                '确认是残留再删对应目录（内含 worktree 时先在主仓 git worktree remove）。'
            )
          })
          .catch(() => undefined)
      }
    }
    applyGuard()
    // 先恢复持久化的 worker 跟踪，再对账：/reload 或会话恢复后
    // rex_list_workers / /rex-status / /rex-cleanup 仍能看到既有 worker。
    void (async () => {
      if (!registryRestored && store !== undefined) {
        registryRestored = true
        const saved = await store.loadRegistry()
        if (Array.isArray(saved)) registry.restore(saved)
      }
      await events.reconcile()
    })().catch(() => undefined)
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
    events.stop()
    if (previousTools !== undefined) {
      pi.setActiveTools(previousTools)
      previousTools = undefined
    }
  })

  // ---------------------------------------------------------------- tools

  pi.registerTool({
    name: 'rex_cli',
    label: 'Rex CLI',
    description:
      'Operate Rex with an argv array, never a shell string. Discover the current syntax with rex_cli(["__internal","skill"]) or rex_cli(["--help"]); when a command fails, read the returned stderr and correct the argv.',
    exposure: 'model-only',
    executionMode: 'parallel',
    parameters: {
      type: 'object',
      properties: {
        args: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'Rex executable arguments; each command argument is a separate array item.'
        }
      },
      required: ['args'],
      additionalProperties: false
    },
    async execute(_id, params: { args: string[] }) {
      return executeRexCli(params.args, {
        exec: (command, args, options) => pi.exec(command, args, options),
        bin: deps.rexBin,
        session: deps.rexSession,
        workerAgentBinaries: rexCliWorkerAgentBinaries
      })
    }
  })

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
      // hasUI 前置：print/json/rpc 模式下没有弹窗能力，两条分支都要走同一个降级。
      if (!ctx.hasUI) {
        return text('当前会话没有弹窗 UI：请把问题直接写进对话向用户提问。', true)
      }
      const options = params.options?.filter(option => option.trim() !== '') ?? []
      if (options.length === 0) {
        const ok = await ctx.ui.confirm(params.question, '确认该操作？')
        return text(ok ? '用户确认。' : '用户取消。', !ok)
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
      return lifecycle.spawn(params, ctx)
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
      return lifecycle.list()
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
      return lifecycle.sendInput(params, ctx)
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
    async execute(toolCallId: string, params: { worker_id: string; tail_lines?: number }) {
      const result = await lifecycle.inspectOutput(params)
      if (!result.isError) {
        latestInspectCall.set(params.worker_id, toolCallId)
        inspectCallToWorker.set(toolCallId, params.worker_id)
      }
      return result
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
      const result = await lifecycle.inspectChanges(params)
      if (!result.isError) {
        latestInspectCall.set(params.worker_id, toolCallId)
        inspectCallToWorker.set(toolCallId, params.worker_id)
      }
      return result
    }
  })

  pi.registerTool({
    name: 'rex_close_worker',
    label: 'Rex Close Worker',
    description:
      'Close a worker: close its blocks, then clean its worktree only when it is clean AND its branch is merged by ancestry or its diff content is already present in the base (covering squash merges). If content is not confirmed, report the repository-flow, optional local merge, and force choices; perform git merge --no-ff only for a repository without a PR flow and only after explicit confirmation. A failed merge is diagnosed and reported without automatic git merge --abort. Pass force: true to drop a branch with git branch -D after user consent.',
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
      return closeWorker(
        { adapter, registry, gitExec, persistRegistry },
        { workerId: params.worker_id, force: params.force },
        ctx
      )
    }
  })

  // ---------------------------------------------------------------- commands

  pi.registerCommand('rex-status', {
    description: '查看事件流健康度、活跃 worker、交接区路径',
    async handler(_args, ctx) {
      const workers = registry.list()
      const streamStatus = events.status()
      const lines = [
        `事件流：${streamStatus.connected ? '已连接' : '未连接'}（连续重连失败 ${streamStatus.reconnectFails} 次）`,
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
      if (!lifecycle.setPaused(workerId, true)) {
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
      if (!lifecycle.setPaused(workerId, false)) {
        ctx.ui.notify(`没有 worker "${workerId}"`, 'warning')
        return
      }
      ctx.ui.notify(`${workerId} 已解除接管保护`, 'info')
    }
  })

  pi.registerCommand('rex-cleanup', {
    description: '回收已结束 worker 的残留 Block 与已落地 / 确认废弃的 worktree',
    async handler(_args, ctx) {
      await cleanupWorkers({ adapter, registry, gitExec, persistRegistry }, ctx)
    }
  })

  events.start()

  return {
    dispose() {
      events.stop()
      if (previousTools !== undefined) pi.setActiveTools(previousTools)
    }
  }
}
