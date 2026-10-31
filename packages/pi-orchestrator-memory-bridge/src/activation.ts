/**
 * 激活门槛。
 *
 * Herdr 对每个 pane 都注入同一组 `HERDR_*` 变量，其中没有任何角色字段。orchestrator 的
 * worker 与 reviewer 各自在自己的 pane 里起一个 agent（`kind` 可以是 `pi`），因此只靠
 * `HERDR_ENV` / `HERDR_PANE_ID` 无法把它们和 lead 分开，桥接扩展会在 worker pane 里一起
 * 跑起来。
 *
 * 判定依据是 `herdr agent list`：被 `herdr agent start <name>` 起出来的 agent 带 `name`，
 * lead 会话的 agent 名字为空。这条信号确定、不需要改 orchestrator，代价是启动时一次子进程。
 *
 * 探测失败时不激活。桥接扩展在 worker 里运行的代价（重复注入、抢着写记忆）远高于在 lead
 * 里漏激活（少一段上下文，用户能立刻看出来），所以这里 fail closed。
 */

import type { Activation, HerdrAgentEntry } from './contracts'

/** 与 herdr `agent list` 输出的 JSON 形状解耦的最小读取器。 */
export interface ActivationDeps {
  readonly env: Record<string, string | undefined>
  /** 返回当前 pane 已注册的 agent 名字；undefined 表示该 pane 没有注册 agent。 */
  listAgentNames(): Promise<ReadonlyArray<HerdrAgentEntry>>
}

const HERDR_ENV_KEY = 'HERDR_ENV'
const PANE_ID_KEY = 'HERDR_PANE_ID'

/**
 * 判定当前进程是否属于编排层的 lead。
 *
 * 纯函数式读取 env，只有「确认为具名 agent」需要一次 `listAgentNames()`。任何异常都折算成
 * `probe-failed`，调用方据此安静加载。
 */
export async function detectActivation(deps: ActivationDeps): Promise<Activation> {
  const env = deps.env
  if (env[HERDR_ENV_KEY] !== '1') return { active: false, reason: 'no-herdr-env' }

  const paneId = env[PANE_ID_KEY]?.trim()
  if (!paneId) return { active: false, reason: 'no-pane-id' }

  let agents: ReadonlyArray<HerdrAgentEntry>
  try {
    agents = await deps.listAgentNames()
  } catch {
    return { active: false, reason: 'probe-failed' }
  }

  const mine = agents.find(agent => agent.pane_id === paneId)
  const agentName = mine?.name?.trim()
  if (agentName) return { active: false, reason: 'worker-pane' }

  return { active: true, paneId }
}

/**
 * 从 `herdr agent list` 的完整输出里取 agent 列表。
 *
 * herdr 把结果包在 `{ result: { agents: [...] } }` 里；格式不符时抛错，由
 * `detectActivation` 折算成 `probe-failed`。
 */
export function parseAgentList(stdout: string): ReadonlyArray<HerdrAgentEntry> {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`herdr agent list: unparsable output (${detail})`)
  }
  if (typeof parsed !== 'object' || parsed === null) throw new Error('herdr agent list: not an object')
  const result = (parsed as { result?: unknown }).result
  if (typeof result !== 'object' || result === null) throw new Error('herdr agent list: no result')
  const agents = (result as { agents?: unknown }).agents
  if (!Array.isArray(agents)) throw new Error('herdr agent list: no agents array')
  return agents as HerdrAgentEntry[]
}
