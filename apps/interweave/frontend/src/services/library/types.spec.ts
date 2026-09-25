import { describe, expect, it } from 'vite-plus/test'

import { isSourceAvailabilityEvent } from './types'

describe('isSourceAvailabilityEvent（事件载荷守卫）', () => {
  it('接受完整载荷，size_bytes 缺省也接受', () => {
    expect(
      isSourceAvailabilityEvent({
        source_id: 's1',
        resource_id: 'r1',
        type: 'file',
        available: false,
        size_bytes: 128,
        changed_at: 200
      })
    ).toBe(true)
    expect(
      isSourceAvailabilityEvent({
        source_id: 's1',
        resource_id: 'r1',
        type: 'file',
        available: true,
        changed_at: 200
      })
    ).toBe(true)
  })

  it('拒绝 null、数组、字符串与缺字段载荷', () => {
    expect(isSourceAvailabilityEvent(null)).toBe(false)
    expect(isSourceAvailabilityEvent(undefined)).toBe(false)
    expect(isSourceAvailabilityEvent('source-availability')).toBe(false)
    expect(isSourceAvailabilityEvent([])).toBe(false)
    expect(isSourceAvailabilityEvent({})).toBe(false)
    expect(
      isSourceAvailabilityEvent({
        resource_id: 'r1',
        type: 'file',
        available: true,
        changed_at: 200
      })
    ).toBe(false)
  })

  it('拒绝字段类型错误：available 非布尔、changed_at 缺数值、size_bytes 非数字', () => {
    const base = { source_id: 's1', resource_id: 'r1', type: 'file', available: true, changed_at: 200 }
    expect(isSourceAvailabilityEvent({ ...base, available: 'true' })).toBe(false)
    expect(isSourceAvailabilityEvent({ ...base, changed_at: undefined })).toBe(false)
    expect(isSourceAvailabilityEvent({ ...base, source_id: '' })).toBe(false)
    expect(isSourceAvailabilityEvent({ ...base, size_bytes: '128' })).toBe(false)
  })
})
