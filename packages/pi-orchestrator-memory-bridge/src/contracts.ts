/**
 * 编排层记忆桥接的核心契约。
 *
 * 这个模块只描述「是什么」，不描述「怎么拿」：环境探测、记忆读写、board 摘要、pi-memory
 * 的调用都通过依赖注入进来，因此单元测试不需要真跑 Pi 或 herdr。副作用边界集中在这里，
 * 便于逐条核对「不写 transcript、不存 worker 输出、不跨仓库泄漏」这些硬约束。
 */

/** 一次编排记忆条目。key 一定是 `orchestration.<repo-key>.<kind>.<slot>` 形式。 */
export interface OrchestrationFact {
  readonly key: string
  readonly value: string
  readonly confidence: number
  readonly source: string
  /** 是否已 pin 到 pi-memory；pin 会影响它是否进入 pi-memory 自己的 pinned 注入。 */
  readonly pinned?: boolean
}

/** 锚点类型：计划获批、审查拒绝。两者写入不同的 key 前缀。 */
export type AnchorKind = 'decision' | 'rejection'

/** 从 `herdr_plan` / `herdr_review` 的 tool result 里提取出来的待写入内容。 */
export interface PendingAnchor {
  readonly kind: AnchorKind
  /** 稳定的记忆键后缀，同一逻辑事件重复触发时必须得到同一个值。 */
  readonly slot: string
  /** 写入的记忆值；只放决策/拒绝的要点，不放终端输出或 diff。 */
  readonly value: string
}

/** 环境探测结果。inactive 时桥接扩展必须安静加载，不注册工具、不注册钩子。 */
export type Activation =
  | { readonly active: true; readonly paneId: string; readonly agentName?: string }
  | { readonly active: false; readonly reason: InactiveReason }

export type InactiveReason =
  /** 不在 Herdr pane 内：HERDR_ENV 不是 "1"。 */
  | 'no-herdr-env'
  /** HERDR_PANE_ID 缺失或为空。 */
  | 'no-pane-id'
  /** 当前 pane 已被 herdr 注册为某个具名 agent，也就是 worker 或 reviewer。 */
  | 'worker-pane'
  /** 探测 herdr 失败，无法排除是 worker，按保守策略不激活。 */
  | 'probe-failed'

/** 判读 herdr `agent list` 输出所需的最小形状。 */
export interface HerdrAgentEntry {
  readonly pane_id?: string
  readonly agent?: string
  readonly name?: string | null
  /** Herdr 生命周期状态：`idle` / `working` / `blocked` / `done` / `unknown`。并发闸门按它判槽位。 */
  readonly agent_status?: string
}

/** 记忆后端。锁定 `@pedro_klein/pi-memory`，接口收窄到桥接真正用到的动作。 */
export interface MemoryBackend {
  search(query: string, options: { scope: 'current' | 'global' | 'all'; limit: number }): Promise<OrchestrationFact[]>
  remember(input: { key: string; value: string; pinned?: boolean }): Promise<void>
  pin(input: { key: string; action: 'pin' | 'unpin' }): Promise<void>
  /**
   * 撤销编排键的 pin；键本就未 pin 时按 no-op 成功处理。
   *
   * `pi-memory` 的 pinned 注入不按仓库分区，非 `project.*` 的编排键一旦 pin 就会进入同机
   * 所有仓库的 system prompt，所以写入后必须主动撤销。
   */
  ensureUnpinned(key: string): Promise<void>
}

/**
 * 调 pi-memory 工具的底层通道。
 *
 * 只有工具自己的 `execute()` 拿得到 `ctx.executeTool`，事件钩子没有。所以写入路径是
 * 「钩子识别锚点 → 置 pending → agent_before_settle 追加一轮指令 → 工具调用真正写入」。
 */
export type ToolCaller = (name: string, args: Record<string, unknown>) => Promise<{ ok: boolean; text: string }>

/** board 摘要。board 不可用时是 undefined，调用方必须静默降级。 */
export interface BoardSummary {
  readonly panel: string
  readonly counts: Record<string, number>
  readonly items: ReadonlyArray<{ readonly id: string; readonly title: string; readonly status: string }>
}
