// @vitest-environment jsdom

import { toast } from '@greypan/web-ui'
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
    createdAt: new Date(2026, 0, 15, 12, 0).getTime(),
    updatedAt: new Date(2026, 1, 20, 12, 0).getTime(),
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
  it('splitNumericSegments 正确切分纯文本、独立比值、千分位小数及混合文案', () => {
    expect(monoDigitsClass).toBe('font-mono tabular-nums')
    expect(splitNumericSegments('')).toEqual([])
    expect(splitNumericSegments('确认导入')).toEqual([{ text: '确认导入', numeric: false }])
    expect(splitNumericSegments('3 / 20')).toEqual([{ text: '3 / 20', numeric: true }])
    expect(splitNumericSegments('已检查 1,234.5 项')).toEqual([
      { text: '已检查 ', numeric: false },
      { text: '1,234.5', numeric: true },
      { text: ' 项', numeric: false }
    ])
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

  it('DetailDrawer：按行校验大小、创建于与最后修改于使用等宽数字，非数值字段不带等宽类', async () => {
    const resource = makeResource()
    const host = mountComponent(() =>
      h(DetailDrawer, {
        open: true,
        resource,
        mobile: false,
        editingNameKey: null,
        editorRef: () => () => {},
        replacingSourceIds: [],
        resolveDefaultOpenWith: () => Promise.resolve('')
      })
    )
    await nextTick()

    const rows = [...host.querySelectorAll('.detail-row')]
    const valueOf = (label: string) =>
      rows.find(row => row.querySelector('span')?.textContent?.trim() === label)?.querySelector('small') ?? null

    const expectedRows: Array<[string, string]> = [
      ['大小', '2 MB'],
      ['创建于', '2026-01-15'],
      ['最后修改于', '2026-02-20']
    ]
    for (const [label, expectedText] of expectedRows) {
      const value = valueOf(label)
      expect(value, `${label} 应渲染数值节点`).not.toBeNull()
      expect(value!.classList.contains('font-mono'), `${label} 应带 font-mono`).toBe(true)
      expect(value!.classList.contains('tabular-nums'), `${label} 应带 tabular-nums`).toBe(true)
      expect(value!.textContent?.trim()).toBe(expectedText)
    }
    expect(valueOf('类型')?.classList.contains('font-mono')).toBe(false)
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

  it('RestoreDialog 与 RestoreRow：队列计数、扫描统计、候选触发与候选列表使用等宽数字', async () => {
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
      id: 'src-1',
      sourceId: 'src-1',
      resourceId: 'res-1',
      resourceTitle: '失效文件',
      resourceKind: ResourceKind.ResourceKindImage,
      kind: 'file',
      location: '/old/a.png',
      replacementLocation: ''
    }
    const candidateModifiedAt = new Date(2026, 0, 15, 12, 0).getTime()
    const makeCandidate = (path: string) => ({
      sourceID: item.sourceId,
      path,
      size: 1024 * 1024,
      modifiedAt: candidateModifiedAt,
      matchReasons: ['name'],
      snapshot: path
    })
    const notification = vi.spyOn(toast, 'info').mockReturnValue('scan-toast')

    try {
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
            candidates: [makeCandidate('/new/a-1.png'), makeCandidate('/new/a-2.png')],
            checked: 12,
            currentDirectory: '/',
            skipped: 3,
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

      const button = (text: string) =>
        [...dialogHost.querySelectorAll<HTMLElement>('button, web-ui-button')].find(
          el => el.textContent?.trim() === text
        )!
      button('一键扫描').click()
      await nextTick()
      button('扫描全盘').click()

      await vi.waitFor(() => expect(dialogHost.textContent).toContain('找到 2 个候选'))
      const statNumbers = [...dialogHost.querySelectorAll<HTMLElement>('.scan-stats strong')]
      expect(statNumbers).toHaveLength(3)
      for (const stat of statNumbers) {
        expect(stat.classList.contains('font-mono')).toBe(true)
        expect(stat.classList.contains('tabular-nums')).toBe(true)
      }
      expect(statNumbers.map(node => node.textContent?.trim())).toEqual(['12', '1', '3'])

      const candidateTrigger = button('找到 2 个候选，选择文件')
      expect(candidateTrigger.querySelector('.font-mono.tabular-nums')?.textContent?.trim()).toBe('2')
      candidateTrigger.click()
      await nextTick()

      const choice = [...dialogHost.querySelectorAll<HTMLButtonElement>('.candidate-option')].find(el =>
        el.textContent?.includes('/new/a-2.png')
      )!
      expect(choice).toBeTruthy()
      const candidateMono = [...choice.querySelectorAll<HTMLElement>('.font-mono.tabular-nums')]
      expect(candidateMono.length).toBeGreaterThanOrEqual(2)
      expect(candidateMono[0]?.textContent?.trim()).toBe('1 MB')
      const modifiedText = candidateMono[1]?.textContent?.trim() ?? ''
      expect(modifiedText).toMatch(/2026/)
      expect(modifiedText).toMatch(/15/)
    } finally {
      notification.mockRestore()
    }
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
