/**
 * Rex 事件流的双层 JSON 解析。
 *
 * 真实形态（2026-11-19 `rex events -s <session> --json` 实测，rex 0.1.0-preview.21）：
 *
 * ```
 * {"type":"session_event","payload":{"session_id":"...","event":{"type":"block_event",
 *  "payload":{"block_id":"...","creator_name":"com.superlogical.terminal","name":"child_exited",
 *  "payload":{"exit_code":0}}}}}
 * ```
 *
 * 内层还有 `block_created` / `block_closed`（payload 直接是 `{block_id}`）。没实测到的
 * `program_status_changed` / `program_status_removed` 按设计文档的形状解析，并且保持
 * 「不认识就当作没有」：形状对不上时静默归入 `ignored`，不抛异常进钩子。
 */

export interface ProgramStatusRecord {
  state: string
  /** blocked 的原因类别（`permission` / `auth` 等）；非 blocked 状态没有该字段。 */
  kind?: string
  msg?: string
  app?: string
  updatedAt?: string
}

export interface StatusChange {
  /** OSC 7501 状态记录的 id（`payload.id`）。 */
  id: string
  record: ProgramStatusRecord
}

export type RexEvent =
  | { kind: 'block_created'; blockId: string }
  | { kind: 'block_closed'; blockId: string }
  | { kind: 'program_status_changed'; blockId: string; changes: StatusChange[] }
  | { kind: 'program_status_removed'; blockId: string; ids: string[] }
  | { kind: 'child_exited'; blockId: string; exitCode?: number; error?: string }
  | { kind: 'process_changed'; blockId: string }
  | { kind: 'ignored' }

interface InnerEvent {
  type?: unknown
  payload?: unknown
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** 解析一行 NDJSON；空行与无法解析的行归入 `ignored`。 */
export function parseRexEventLine(line: string): RexEvent {
  const trimmed = line.trim()
  if (trimmed === '') return { kind: 'ignored' }
  let outer: unknown
  try {
    outer = JSON.parse(trimmed)
  } catch {
    return { kind: 'ignored' }
  }
  const outerRecord = asRecord(outer)
  if (!outerRecord || outerRecord.type !== 'session_event') return { kind: 'ignored' }
  const payload = asRecord(outerRecord.payload)
  const inner = asRecord(payload?.event) as InnerEvent | undefined
  if (!inner || typeof inner.type !== 'string') return { kind: 'ignored' }

  switch (inner.type) {
    case 'block_created':
    case 'block_closed': {
      const body = asRecord(inner.payload)
      const blockId = asString(body?.block_id)
      return blockId === undefined
        ? { kind: 'ignored' }
        : inner.type === 'block_created'
          ? { kind: 'block_created', blockId }
          : { kind: 'block_closed', blockId }
    }
    case 'block_event':
      return parseBlockEvent(asRecord(inner.payload))
    default:
      return { kind: 'ignored' }
  }
}

function parseBlockEvent(body: Record<string, unknown> | undefined): RexEvent {
  const blockId = asString(body?.block_id)
  const name = asString(body?.name)
  if (!body || blockId === undefined || name === undefined) return { kind: 'ignored' }
  if (body.creator_name !== undefined && body.creator_name !== 'com.superlogical.terminal') {
    return { kind: 'ignored' }
  }
  const payload = asRecord(body.payload)

  switch (name) {
    case 'child_exited': {
      const exitCode = typeof payload?.exit_code === 'number' ? payload.exit_code : undefined
      const error = asString(payload?.error)
      return { kind: 'child_exited', blockId, exitCode, error }
    }
    case 'process_changed':
      return { kind: 'process_changed', blockId }
    case 'program_status_changed': {
      const changes = parseStatusChanges(payload)
      return changes.length === 0 ? { kind: 'ignored' } : { kind: 'program_status_changed', blockId, changes }
    }
    case 'program_status_removed': {
      const ids = Array.isArray(payload?.ids) ? payload.ids.filter(id => typeof id === 'string') : []
      return { kind: 'program_status_removed', blockId, ids: ids as string[] }
    }
    default:
      return { kind: 'ignored' }
  }
}

/** 兼容 `{id, record}` 单条与 `{records: [{id, record}]}` 数组两种形状。 */
function parseStatusChanges(payload: Record<string, unknown> | undefined): StatusChange[] {
  if (!payload) return []
  const single = parseStatusChange(payload)
  if (single) return [single]
  if (Array.isArray(payload.records)) {
    return payload.records
      .map(item => parseStatusChange(asRecord(item)))
      .filter((change): change is StatusChange => change !== undefined)
  }
  return []
}

function parseStatusChange(item: Record<string, unknown> | undefined): StatusChange | undefined {
  if (!item) return undefined
  const id = asString(item.id)
  const record = asRecord(item.record)
  if (id === undefined || !record) return undefined
  return {
    id,
    record: {
      state: asString(record.state) ?? 'unknown',
      kind: asString(record.kind),
      msg: asString(record.msg),
      app: asString(record.app),
      updatedAt: asString(record.updated_at)
    }
  }
}

/** `rex block ls --short=false --json` 的条目形状（实测）。 */
export interface RexBlockInfo {
  blockId: string
  label: string
  flavor: string
  windowId: string
  placement: string
}

export function parseBlockList(stdout: string): RexBlockInfo[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    throw new Error(`rex block ls 输出不是合法 JSON: ${stdout.slice(0, 200)}`)
  }
  const blocks = asRecord(parsed)?.blocks
  if (!Array.isArray(blocks)) {
    throw new Error(`rex block ls 输出缺少 blocks 数组: ${stdout.slice(0, 200)}`)
  }
  const infos: RexBlockInfo[] = []
  for (const entry of blocks) {
    const record = asRecord(entry)
    const blockId = asString(record?.block_id)
    if (blockId === undefined) continue
    infos.push({
      blockId,
      label: asString(record?.label) ?? '',
      flavor: asString(record?.flavor) ?? '',
      windowId: asString(record?.window_id) ?? '',
      placement: asString(record?.placement) ?? ''
    })
  }
  return infos
}

/** `rex run --json` 的创建结果形状（实测）。 */
export interface RexRunResult {
  windowId: string
  blockIds: string[]
}

export function parseRunResult(stdout: string): RexRunResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    throw new Error(`rex run 输出不是合法 JSON: ${stdout.slice(0, 200)}`)
  }
  const record = asRecord(parsed)
  const windowId = asString(record?.window_id)
  const blockIds = Array.isArray(record?.block_ids) ? record.block_ids.filter(id => typeof id === 'string') : []
  if (windowId === undefined || blockIds.length === 0) {
    throw new Error(`rex run 输出缺少 window_id / block_ids: ${stdout.slice(0, 200)}`)
  }
  return { windowId, blockIds: blockIds as string[] }
}
