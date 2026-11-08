import { describe, expect, it, vi } from 'vite-plus/test'
import { ref } from 'vue'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ResourceSourceView, ResourceView } from '../../stores/library'
import { useLibrarySelection } from '../useLibrarySelection'

function source(available: boolean, overrides: Partial<ResourceSourceView> = {}): ResourceSourceView {
  return {
    id: 'source-1',
    type: 'url',
    location: 'https://example.com',
    available,
    isPreferred: true,
    orderIndex: 0,
    mediaUrl: null,
    thumbnailUrl: null,
    metadata: null,
    ...overrides
  }
}

function resource(id: string, sources: ResourceSourceView[] = [source(true)]): ResourceView {
  return {
    id,
    title: id,
    note: '',
    createdAt: 0,
    updatedAt: 0,
    sources,
    preferred: sources[0] ?? null,
    tags: [],
    tagNames: [],
    // 至少一个入口可用即为可用；本文件只关心 sources，可用性由调用点自拟。
    available: sources.some(item => item.available),
    kind: ResourceKind.ResourceKindWeb,
    sizeBytes: null
  }
}

function useSetup(all: ResourceView[], visible: ResourceView[] = all) {
  const detailOpen = ref(false)
  const filterOpen = ref(false)
  const stopResourceRename = vi.fn<() => void>()
  const selection = useLibrarySelection({
    visibleResources: ref(visible),
    resources: ref(all),
    detailOpen,
    filterOpen,
    stopResourceRename
  })
  return { selection, detailOpen, filterOpen, stopResourceRename }
}

describe('useLibrarySelection：进入与退出选择态', () => {
  it('进入选择态时收起详情 drawer、筛选 panel 并停止重命名；退出时清空勾选', () => {
    const { selection, detailOpen, filterOpen, stopResourceRename } = useSetup([resource('r-1')], [resource('r-1')])
    detailOpen.value = true
    filterOpen.value = true

    selection.toggleSelectionMode()

    expect(selection.selectionMode.value).toBe(true)
    expect(detailOpen.value).toBe(false)
    expect(filterOpen.value).toBe(false)
    expect(stopResourceRename).toHaveBeenCalledOnce()

    selection.toggleCheckAll()
    expect(selection.checkedIds.value).toEqual(['r-1'])
    selection.toggleSelectionMode()

    expect(selection.selectionMode.value).toBe(false)
    expect(selection.checkedIds.value).toEqual([])
  })
})

describe('useLibrarySelection：勾选操作', () => {
  it('toggleChecked 翻转单项', () => {
    const { selection } = useSetup([resource('r-1'), resource('r-2')])

    selection.toggleChecked('r-1')
    expect(selection.checkedIds.value).toEqual(['r-1'])
    selection.toggleChecked('r-1')
    expect(selection.checkedIds.value).toEqual([])
  })

  it('setResourceChecked 置态而不是翻转：同一状态重复划过不弹回', () => {
    const { selection } = useSetup([resource('r-1')])

    selection.setResourceChecked('r-1', true)
    selection.setResourceChecked('r-1', true)
    expect(selection.checkedIds.value).toEqual(['r-1'])

    selection.setResourceChecked('r-1', false)
    selection.setResourceChecked('r-1', false)
    expect(selection.checkedIds.value).toEqual([])
  })

  it('toggleCheckAll 只操作可见项：全选保留既有不可见勾选，取消只取消可见项', () => {
    const hidden = resource('r-hidden')
    const { selection } = useSetup([resource('r-1'), resource('r-2'), hidden], [resource('r-1'), resource('r-2')])
    selection.toggleChecked('r-hidden')

    selection.toggleCheckAll()
    expect(selection.checkedIds.value).toEqual(['r-hidden', 'r-1', 'r-2'])

    selection.toggleCheckAll()
    expect(selection.checkedIds.value).toEqual(['r-hidden'])
  })
})

describe('useLibrarySelection：派生判定', () => {
  it('allVisibleSelected：空列表为 false，部分选中为 false，全部可见选中（含额外不可见勾选）为 true', () => {
    const r1 = resource('r-1')
    const r2 = resource('r-2')
    const { selection } = useSetup([r1, r2], [r1])

    expect(selection.allVisibleSelected.value).toBe(false)

    selection.toggleCheckAll()
    expect(selection.allVisibleSelected.value).toBe(true)
  })

  it('allVisibleSelected 在无可见资源时为 false', () => {
    const { selection } = useSetup([], [])
    expect(selection.allVisibleSelected.value).toBe(false)
  })

  it('selectedResources 从全量资源取回：被筛掉的已选项仍参与统计', () => {
    const r1 = resource('r-1')
    const r2 = resource('r-2')
    const { selection } = useSetup([r1, r2], [r1])

    selection.toggleChecked('r-1')
    selection.toggleChecked('r-2')
    expect(selection.selectedResources.value.map(item => item.id)).toEqual(['r-1', 'r-2'])
  })

  it('canRestore：无选中为 false，全部含不可用入口为 true，存在全可用资源为 false', () => {
    const broken = resource('r-broken', [source(false)])
    const healthy = resource('r-healthy', [source(true)])
    const mixed = resource('r-mixed', [source(false), source(true)])
    const { selection } = useSetup([broken, healthy, mixed], [broken, healthy, mixed])

    expect(selection.canRestore.value).toBe(false)

    selection.toggleChecked('r-broken')
    selection.toggleChecked('r-mixed')
    expect(selection.canRestore.value).toBe(true)

    selection.toggleChecked('r-healthy')
    expect(selection.canRestore.value).toBe(false)
  })
})
