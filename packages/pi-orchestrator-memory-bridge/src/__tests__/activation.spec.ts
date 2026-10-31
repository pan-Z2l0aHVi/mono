/**
 * 激活门槛。
 *
 * 守的是验收里那条：「worker pane 中不出现桥接扩展的任何输出」。Herdr 的 `HERDR_*` 变量在
 * 每个 pane 里都成立，所以必须靠 `agent list` 的 `name` 区分；探测失败时按 fail closed
 * 处理，因为「在 worker 里跑了」比「在 lead 里没跑」代价大得多。
 */

import { describe, expect, it, vi } from 'vite-plus/test'

import { detectActivation, parseAgentList } from '../activation'
import type { HerdrAgentEntry } from '../contracts'

const listOf = (agents: readonly HerdrAgentEntry[]) =>
  vi.fn<() => Promise<readonly HerdrAgentEntry[]>>(async () => agents)

describe('激活门槛', () => {
  it('没有 HERDR_ENV 时不激活，也不探测 herdr', async () => {
    const listAgentNames = listOf([])
    const activation = await detectActivation({ env: { HERDR_PANE_ID: 'w1:p1' }, listAgentNames })

    expect(activation).toEqual({ active: false, reason: 'no-herdr-env' })
    expect(listAgentNames).not.toHaveBeenCalled()
  })

  it('HERDR_ENV 不是 "1" 时不激活', async () => {
    const activation = await detectActivation({
      env: { HERDR_ENV: 'true', HERDR_PANE_ID: 'w1:p1' },
      listAgentNames: listOf([])
    })

    expect(activation.active).toBe(false)
  })

  it('缺少或空白 HERDR_PANE_ID 时不激活', async () => {
    for (const paneId of [undefined, '', '   ']) {
      const activation = await detectActivation({
        env: { HERDR_ENV: '1', HERDR_PANE_ID: paneId },
        listAgentNames: listOf([])
      })
      expect(activation).toEqual({ active: false, reason: 'no-pane-id' })
    }
  })

  it('lead pane（agent 无 name）激活并保留 paneId', async () => {
    const activation = await detectActivation({
      env: { HERDR_ENV: '1', HERDR_PANE_ID: 'w1:p1' },
      listAgentNames: listOf([{ pane_id: 'w1:p1', agent: 'pi', name: null }])
    })

    expect(activation).toEqual({ active: true, paneId: 'w1:p1' })
  })

  it('pane 不在 agent list 里时按 lead 激活', async () => {
    const activation = await detectActivation({
      env: { HERDR_ENV: '1', HERDR_PANE_ID: 'w1:p9' },
      listAgentNames: listOf([{ pane_id: 'w1:p1', agent: 'pi', name: null }])
    })

    expect(activation.active).toBe(true)
  })

  it('具名 agent 所在 pane（worker 或 reviewer）不激活', async () => {
    const activation = await detectActivation({
      env: { HERDR_ENV: '1', HERDR_PANE_ID: 'w1:p4' },
      listAgentNames: listOf([
        { pane_id: 'w1:p1', agent: 'pi', name: null },
        { pane_id: 'w1:p4', agent: 'pi', name: 'probe-worker2' }
      ])
    })

    expect(activation).toEqual({ active: false, reason: 'worker-pane' })
  })

  it('name 为空白字符串时仍按 lead 处理', async () => {
    const activation = await detectActivation({
      env: { HERDR_ENV: '1', HERDR_PANE_ID: 'w1:p1' },
      listAgentNames: listOf([{ pane_id: 'w1:p1', agent: 'pi', name: '  ' }])
    })

    expect(activation.active).toBe(true)
  })

  it('探测失败时 fail closed', async () => {
    const activation = await detectActivation({
      env: { HERDR_ENV: '1', HERDR_PANE_ID: 'w1:p1' },
      listAgentNames: vi.fn(async () => {
        throw new Error('herdr: command not found')
      })
    })

    expect(activation).toEqual({ active: false, reason: 'probe-failed' })
  })
})

describe('parseAgentList', () => {
  it('取 result.agents', () => {
    const agents = parseAgentList(
      JSON.stringify({ id: 'cli:agent:list', result: { type: 'agent_list', agents: [{ pane_id: 'w1:p1' }] } })
    )

    expect(agents).toHaveLength(1)
    expect(agents[0]?.pane_id).toBe('w1:p1')
  })

  it.each([
    { name: '非 JSON', input: 'not json' },
    { name: '缺少 result', input: JSON.stringify({ agents: [] }) },
    { name: 'agents 不是数组', input: JSON.stringify({ result: { agents: {} } }) },
    { name: '顶层是数组', input: JSON.stringify([]) }
  ])('$name 时抛错，由调用方折算成 probe-failed', ({ input }) => {
    expect(() => parseAgentList(input)).toThrow(/herdr agent list/)
  })
})
