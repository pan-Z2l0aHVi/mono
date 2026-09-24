import { describe, expect, it } from 'vite-plus/test'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import { formatSize, resourceIcon, resourceKindLabel } from '../presentation'

describe('library presentation', () => {
  it('size_bytes 按 KB/MB 格式化并保留一位小数', () => {
    expect(formatSize(18 * 1024)).toBe('18 KB')
    expect(formatSize(2_500_000)).toBe('2.4 MB')
    expect(formatSize(163_577_856)).toBe('156 MB')
  })

  it('缺失、负数或非有限 size 不生成展示文本', () => {
    expect(formatSize(null)).toBeNull()
    expect(formatSize(-1)).toBeNull()
    expect(formatSize(Number.NaN)).toBeNull()
    expect(formatSize(Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('生成 kind 使用对应图标与标签，旧 DTO 的 unknown 使用稳定 fallback', () => {
    expect(resourceKindLabel(ResourceKind.ResourceKindImage)).toBe('图片')
    expect(resourceKindLabel(ResourceKind.ResourceKindVideo)).toBe('视频')
    expect(resourceKindLabel('unknown')).toBe('其他')
    expect(resourceIcon('unknown')).toBe(resourceIcon(ResourceKind.ResourceKindFile))
  })
})
