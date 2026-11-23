// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, type App as VueApp } from 'vue'

import type { LibraryQueueItem, LibraryRuntime } from '@/services/library'
import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import AddDialog from '../components/library/AddDialog.vue'
import ConfirmDialog from '../components/library/ConfirmDialog.vue'
import DetailDrawer from '../components/library/DetailDrawer.vue'
import ErrorBanner from '../components/library/ErrorBanner.vue'
import { monoDigitsClass, splitNumericSegments } from '../components/library/presentation'
import { createPreviewLease } from '../components/library/previewLease'
import ResourceRow from '../components/library/ResourceRow.vue'
import type { LibraryRestoreQueueItem } from '../components/library/restore'
import RestoreDialog from '../components/library/RestoreDialog.vue'
import RestoreRow from '../components/library/RestoreRow.vue'

const mounted: Array<{ app: VueApp; host: HTMLElement }> = []

function mountComponent(render: () => ReturnType<typeof h>): HTMLElement {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({ render })
  mounted.push({ app, host })
  app.mount(host)
  return host
}

function monoDigitTexts(host: HTMLElement): string[] {
  return [...host.querySelectorAll('.font-mono.tabular-nums')].map(node => node.textContent?.trim() ?? '')
}

function makeResource(overrides: Partial<ResourceView> = {}): ResourceView {
  return {
    id: 'r1',
    title: '示例资源',
    note: '',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_086_400_000,
    sources: [
      {
        id: 's1',
        type: 'file',
        location: '/tmp/a.png',
        available: true,
        isPreferred: true,
        orderIndex: 0,
        mediaUrl: null,
        thumbnailUrl: null,
        metadata: null
      },
      {
        id: 's2',
        type: 'url',
        location: 'https://example.com',
        available: true,
        isPreferred: false,
        orderIndex: 1,
        mediaUrl: null,
        thumbnailUrl: null,
        metadata: null
      }
    ],
    preferred: null,
    tags: [],
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 2 * 1024 * 1024,
    ...overrides
  }
}

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
})

describe('全局等宽数字字体（mono-digits）', () => {
  it('splitNumericSegments 正确切分整数、小数、千分位及进度比值', () => {
    expect(monoDigitsClass).toBe('font-mono tabular-nums')
    expect(splitNumericSegments('')).toEqual([])
    expect(splitNumericSegments('共 1,234 项（已完成 3 / 12，占比 25.5%）')).toEqual([
      { text: '共 ', numeric: false },
      { text: '1,234', numeric: true },
      { text: ' 项（已完成 ', numeric: false },
      { text: '3 / 12', numeric: true },
      { text: '，占比 ', numeric: false },
      { text: '25.5', numeric: true },
      { text: '%）', numeric: false }
    ])
  })

  it('ResourceRow：文件大小、时间与来源计数使用等宽数字', async () => {
    const host = mountComponent(() =>
      h(ResourceRow, {
        resource: makeResource(),
        index: 0,
        total: 1,
        mediaUrl: null,
        active: false,
        checked: false,
        checkedAbove: false,
        checkedBelow: false,
        selectionMode: false,
        editingNameKey: null,
        editorRef: () => () => {},
        tabbable: true
      })
    )
    await nextTick()
    expect(monoDigitTexts(host)).toEqual(expect.arrayContaining(['2 MB', '2']))
  })

  it('DetailDrawer：大小、创建时间与更新时间使用等宽数字', async () => {
    const host = mountComponent(() =>
      h(DetailDrawer, {
        open: true,
        resource: makeResource(),
        mobile: false,
        editingNameKey: null,
        editorRef: () => () => {},
        replacingSourceIds: [],
        resolveDefaultOpenWith: () => Promise.resolve('')
      })
    )
    await nextTick()
    expect(monoDigitTexts(host)).toEqual(expect.arrayContaining(['2 MB', '2023-11-15']))
  })

  it('AddDialog：队列数量与导入进度比值使用等宽数字', async () => {
    const queue: LibraryQueueItem[] = [
      {
        id: 'q1',
        kind: 'file',
        title: '测试文件',
        location: '/tmp/test.png',
        tags: [],
        resourceKind: ResourceKind.ResourceKindImage,
        previewToken: null,
        mediaUrl: null
      }
    ]
    const host = mountComponent(() =>
      h(AddDialog, {
        open: true,
        queue,
        busy: true,
        error: '',
        mobile: false,
        tagColors: {},
        previews: {},
        progress: { done: 1, total: 3 }
      })
    )
    await nextTick()
    expect(monoDigitTexts(host)).toEqual(expect.arrayContaining(['1', '1 / 3']))
  })

  it('RestoreDialog 与 RestoreRow：队列计数与候选数量使用等宽数字', async () => {
    const runtime = {
      isAvailable: true,
      resources: {
        prepareFilePreview: vi.fn<() => Promise<{ kind: ResourceKind }>>(async () => ({
          kind: ResourceKind.ResourceKindImage
        })),
        releaseFilePreview: vi.fn<() => Promise<void>>(async () => undefined)
      },
      events: { onPreviewRevoked: () => () => {} }
    } as unknown as LibraryRuntime
    const item: LibraryRestoreQueueItem = {
      id: 'item-1',
      sourceId: 'src-1',
      resourceId: 'res-1',
      resourceTitle: '失效文件',
      resourceKind: ResourceKind.ResourceKindImage,
      kind: 'file',
      location: '/old/a.png',
      replacementLocation: ''
    }
    const dialogHost = mountComponent(() =>
      h(RestoreDialog, {
        open: true,
        queue: [item],
        busy: false,
        error: '',
        mobile: false,
        activeItemId: null,
        allUnavailableFiles: [item],
        failedIds: [],
        chooseFilePath: async () => null,
        chooseDirectory: async () => null,
        startScan: async () => 'scan-1',
        pollScan: async () => ({
          candidates: [],
          checked: 0,
          currentDirectory: '',
          skipped: 0,
          done: true,
          cancelled: false,
          error: ''
        }),
        cancelScan: async () => undefined,
        discardScan: async () => undefined,
        lease: createPreviewLease(runtime)
      })
    )
    const rowHost = mountComponent(() =>
      h(RestoreRow, {
        item,
        pending: true,
        location: item.location,
        source: null,
        locked: false,
        active: false,
        candidateCount: 4,
        matchReasons: []
      })
    )
    await nextTick()
    expect(monoDigitTexts(dialogHost)).toEqual(expect.arrayContaining(['1', '0']))
    expect(monoDigitTexts(rowHost)).toEqual(expect.arrayContaining(['4']))
  })

  it('ConfirmDialog 与 ErrorBanner：动态文案中的数字片段使用等宽数字', async () => {
    const confirmHost = mountComponent(() =>
      h(ConfirmDialog, {
        open: true,
        title: '批量删除',
        message: '确认删除选中的 12 项资源吗？',
        confirmLabel: '删除 12 项',
        busy: false,
        danger: true,
        error: '',
        compact: false
      })
    )
    const errorHost = mountComponent(() =>
      h(ErrorBanner, {
        message: '第 3 / 5 步失败，错误码 404'
      })
    )
    await nextTick()
    expect(monoDigitTexts(confirmHost)).toEqual(expect.arrayContaining(['12']))
    expect(monoDigitTexts(errorHost)).toEqual(expect.arrayContaining(['3 / 5', '404']))
  })
})
