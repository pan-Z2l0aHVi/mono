import '@/assets/global.css'
import '@greypan/web-ui'

import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRuntime } from '../../../services/library'
import { createPreviewLease } from '../previewLease'
import type { LibraryRestoreQueueItem } from '../restore'
import RestoreDialog from '../RestoreDialog.vue'

function createLease() {
  const runtime = {
    isAvailable: true,
    resources: {
      prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindImage }),
      releaseFilePreview: async () => undefined
    },
    events: { onPreviewRevoked: () => () => {} }
  } as unknown as LibraryRuntime
  return createPreviewLease(runtime)
}

const items: LibraryRestoreQueueItem[] = [
  {
    id: 'row-1',
    sourceId: 'row-1',
    resourceId: 'res-1',
    resourceTitle: '25.png',
    resourceKind: ResourceKind.ResourceKindImage,
    kind: 'file',
    location: '/old/25.png',
    replacementLocation: ''
  },
  {
    id: 'row-2',
    sourceId: 'row-2',
    resourceId: 'res-2',
    resourceTitle: '24.png',
    resourceKind: ResourceKind.ResourceKindImage,
    kind: 'file',
    location: '/old/24.png',
    replacementLocation: ''
  }
]

const hosts: HTMLElement[] = []
const apps: { unmount: () => void }[] = []

beforeEach(async () => {
  await document.fonts.ready
})

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

describe('RestoreDialog tooltip 层级', () => {
  it('开启 portal 后首行手动选取 tooltip 渲染在 dialog top layer 且不被第二行按钮遮挡', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    hosts.push(host)

    const app = createApp({
      render: () =>
        h('web-ui-theme', { appearance: 'light', motion: 'reduced' }, [
          h(RestoreDialog, {
            open: true,
            queue: items,
            busy: false,
            error: '',
            mobile: false,
            activeItemId: null,
            chooseFilePath: async () => null,
            allUnavailableFiles: [],
            failedIds: [],
            chooseDirectory: async () => null,
            startScan: async () => 'scan',
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
            lease: createLease()
          })
        ])
    })
    apps.push(app)
    app.mount(host)

    await nextTick()
    const dialogHost = host.querySelector('web-ui-dialog') as HTMLElement & { updateComplete?: Promise<boolean> }
    await dialogHost.updateComplete
    const nativeDialog = dialogHost.shadowRoot!.querySelector('dialog')!
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    const rows = [...host.querySelectorAll<HTMLElement>('[data-dialog-row]')]
    expect(rows).toHaveLength(2)

    const firstTooltip = rows[0]!.querySelector('web-ui-tooltip') as HTMLElement & {
      show: (options?: { instant?: boolean }) => void
      updateComplete?: Promise<boolean>
    }
    expect(firstTooltip.hasAttribute('portal')).toBe(true)

    firstTooltip.show({ instant: true })
    await firstTooltip.updateComplete
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    // portal 挂进原生 <dialog> 的 top layer，且位于对话主体之后，不被虚拟列表行 stacking context 锁住
    const portalHosts = [...nativeDialog.children].filter(el => el.shadowRoot?.querySelector('.tooltip-panel.portal'))
    expect(portalHosts).toHaveLength(1)
    const portalHost = portalHosts[0]!
    const dialogBody = nativeDialog.querySelector('.wui-dialog-body')!
    const children = [...nativeDialog.children]
    expect(children.indexOf(portalHost)).toBeGreaterThan(children.indexOf(dialogBody))

    const panel = portalHost.shadowRoot!.querySelector<HTMLElement>('.tooltip-panel.portal')!
    expect(panel.textContent?.trim()).toBe('手动选取')
    const panelStyle = getComputedStyle(panel)
    expect(panelStyle.position).toBe('fixed')
    expect(Number(panelStyle.zIndex)).toBeGreaterThanOrEqual(1000)

    const panelRect = panel.getBoundingClientRect()
    expect(panelRect.width).toBeGreaterThan(0)
    expect(panelRect.height).toBeGreaterThan(0)

    // 原宿主 shadow 内的本地面板处于隐藏态，不会在行内渲染
    const localPanel = firstTooltip.shadowRoot!.querySelector<HTMLElement>('.tooltip-panel:not(.portal)')!
    expect(getComputedStyle(localPanel).display).toBe('none')
  })
})
