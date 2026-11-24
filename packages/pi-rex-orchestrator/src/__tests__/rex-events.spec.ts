/**
 * rex events 双层 JSON 解析。
 *
 * 期望值来自 2026-11-19 真机抓包（rex 0.1.0-preview.21），是协议样例而不是被测实现
 * 的回声；没实测到的 `program_status_changed` 按设计文档形状断言。
 */

import { describe, expect, it } from 'vite-plus/test'

import { parseBlockList, parseLastExit, parseProgramStatus, parseRexEventLine, parseRunResult } from '../rex-events'

const BLOCK = 'block:01a1f351-1449-784d-b946-af5d16db98e5'
const SESSION = 'session:01a1f203-b75e-7ca2-adad-9f68dc2c087c'

function sessionLine(innerType: string, innerPayload: unknown): string {
  return JSON.stringify({
    type: 'session_event',
    payload: { session_id: SESSION, event: { type: innerType, payload: innerPayload } }
  })
}

describe('实测事件行', () => {
  it('block_created / block_closed', () => {
    expect(parseRexEventLine(sessionLine('block_created', { block_id: BLOCK }))).toEqual({
      kind: 'block_created',
      blockId: BLOCK
    })
    expect(parseRexEventLine(sessionLine('block_closed', { block_id: BLOCK }))).toEqual({
      kind: 'block_closed',
      blockId: BLOCK
    })
  })

  it('child_exited 带 exit_code', () => {
    expect(
      parseRexEventLine(
        sessionLine('block_event', {
          block_id: BLOCK,
          creator_name: 'com.superlogical.terminal',
          name: 'child_exited',
          payload: { exit_code: 0 }
        })
      )
    ).toEqual({ kind: 'child_exited', blockId: BLOCK, exitCode: 0, error: undefined })
  })

  it('非 terminal creator 的 block_event 被忽略', () => {
    const line = sessionLine('block_event', {
      block_id: BLOCK,
      creator_name: 'com.other.app',
      name: 'child_exited',
      payload: { exit_code: 0 }
    })
    expect(parseRexEventLine(line)).toEqual({ kind: 'ignored' })
  })
})

describe('program_status 形状（设计文档形态）', () => {
  it('单条 {id, record}', () => {
    const line = sessionLine('block_event', {
      block_id: BLOCK,
      creator_name: 'com.superlogical.terminal',
      name: 'program_status_changed',
      payload: { id: 'claude-code', record: { state: 'blocked', kind: 'permission', msg: 'approve?' } }
    })
    expect(parseRexEventLine(line)).toEqual({
      kind: 'program_status_changed',
      blockId: BLOCK,
      changes: [{ id: 'claude-code', record: { state: 'blocked', kind: 'permission', msg: 'approve?' } }]
    })
  })

  it('records 数组形态', () => {
    const line = sessionLine('block_event', {
      block_id: BLOCK,
      creator_name: 'com.superlogical.terminal',
      name: 'program_status_changed',
      payload: { records: [{ id: 'a', record: { state: 'working' } }] }
    })
    expect(parseRexEventLine(line)).toEqual({
      kind: 'program_status_changed',
      blockId: BLOCK,
      changes: [{ id: 'a', record: { state: 'working' } }]
    })
  })

  it('program_status_removed 收 ids', () => {
    const line = sessionLine('block_event', {
      block_id: BLOCK,
      creator_name: 'com.superlogical.terminal',
      name: 'program_status_removed',
      payload: { ids: ['a', 'b'] }
    })
    expect(parseRexEventLine(line)).toEqual({ kind: 'program_status_removed', blockId: BLOCK, ids: ['a', 'b'] })
  })

  it('形状对不上归入 ignored，不抛异常', () => {
    expect(
      parseRexEventLine(sessionLine('block_event', { block_id: BLOCK, name: 'program_status_changed', payload: {} }))
    ).toEqual({ kind: 'ignored' })
    expect(parseRexEventLine('')).toEqual({ kind: 'ignored' })
    expect(parseRexEventLine('not json')).toEqual({ kind: 'ignored' })
    expect(parseRexEventLine('{"type":"other"}')).toEqual({ kind: 'ignored' })
  })
})

describe('block ls / run 的 JSON 输出', () => {
  it('parseBlockList 读实测形状', () => {
    const stdout = JSON.stringify({
      blocks: [
        {
          block_id: BLOCK,
          label: 'shell',
          creator_name: 'com.superlogical.terminal',
          flavor: 'com.superlogical.terminal.shell',
          placement: 'placed',
          window_id: 'window:01a1f206'
        }
      ]
    })
    expect(parseBlockList(stdout)).toEqual([
      {
        blockId: BLOCK,
        label: 'shell',
        flavor: 'com.superlogical.terminal.shell',
        windowId: 'window:01a1f206',
        placement: 'placed'
      }
    ])
  })

  it('parseBlockList 拒绝非 JSON 与缺 blocks 的输出', () => {
    expect(() => parseBlockList('oops')).toThrow('block ls')
    expect(() => parseBlockList('{}')).toThrow('blocks')
  })

  it('parseRunResult 读实测形状并拒绝缺字段', () => {
    const stdout = JSON.stringify({ window_id: 'window:w1', block_ids: [BLOCK], revision: 2000000064 })
    expect(parseRunResult(stdout)).toEqual({ windowId: 'window:w1', blockIds: [BLOCK] })
    expect(() => parseRunResult('{"window_id":"w"}')).toThrow('block_ids')
  })
})

describe('parseProgramStatus & parseLastExit', () => {
  it('parses program_status records and falls back id to app or unknown', () => {
    const changes = parseProgramStatus(
      JSON.stringify({
        records: [
          { state: 'blocked', kind: 'permission', msg: 'approve?', app: 'claude', updated_at: '2026-11-24T00:00:00Z' },
          { state: 'running' },
          { notState: true }
        ]
      })
    )
    expect(changes).toEqual([
      {
        id: 'claude',
        record: {
          state: 'blocked',
          kind: 'permission',
          msg: 'approve?',
          app: 'claude',
          updatedAt: '2026-11-24T00:00:00Z'
        }
      },
      {
        id: 'unknown',
        record: { state: 'running', kind: undefined, msg: undefined, app: undefined, updatedAt: undefined }
      }
    ])
    expect(() => parseProgramStatus('not-json')).toThrow(/program_status/)
  })

  it('parses process last_exit exit_code or returns undefined when absent', () => {
    expect(parseLastExit(JSON.stringify({ last_exit: { exit_code: 0 } }))).toBe(0)
    expect(parseLastExit(JSON.stringify({ last_exit: { exit_code: 130, error: 'sigint' } }))).toBe(130)
    expect(parseLastExit(JSON.stringify({ last_exit: null }))).toBeUndefined()
    expect(parseLastExit(JSON.stringify({}))).toBeUndefined()
    expect(() => parseLastExit('{bad')).toThrow(/process/)
  })
})
