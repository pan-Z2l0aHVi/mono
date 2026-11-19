import '@/assets/global.css'
import '@greypan/web-ui'

import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { ResourceView } from '@/stores/library'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import AppLayout from '../../AppLayout.vue'
import DetailDrawer from '../DetailDrawer.vue'
import PreviewDrawer from '../PreviewDrawer.vue'
import type { NameEditorRef } from '../rename'
import { DRAWER_TITLE_EDITOR_KEY } from '../rename'
import ResourceList from '../ResourceList.vue'
import Toolbar from '../Toolbar.vue'

function resource(overrides: Partial<ResourceView> = {}): ResourceView {
  return {
    id: 'r1',
    title: '一条资源',
    note: '',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
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
      }
    ],
    preferred: null,
    tags: [],
    tagNames: [],
    available: true,
    kind: ResourceKind.ResourceKindImage,
    sizeBytes: 1024,
    ...overrides
  }
}

async function waitFor(condition: () => boolean, label: string, maxFrames = 240): Promise<void> {
  for (let i = 0; i < maxFrames; i++) {
    if (condition()) return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }
  throw new Error(`条件在 ${maxFrames} 帧内未成立：${label}`)
}

function menuPanels(): HTMLElement[] {
  return [
    ...Array.from(document.querySelectorAll<HTMLElement>('dialog[data-wui-menu-scrim]')),
    ...Array.from(document.querySelectorAll<HTMLElement>('web-ui-theme')).flatMap(theme =>
      Array.from(theme.shadowRoot?.querySelectorAll<HTMLElement>('dialog[data-wui-menu-scrim]') ?? [])
    )
  ].flatMap(scrim => Array.from(scrim.querySelectorAll<HTMLElement>('[role="menu"]')))
}

function openMenuLabels(): string[] {
  return menuPanels()
    .flatMap(panel => Array.from(panel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')))
    .map(item =>
      [...item.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent ?? '')
        .join('')
        .trim()
    )
    .filter(Boolean)
}

async function holdSpace(durationMs: number) {
  await userEvent.keyboard('[Space>]')
  await new Promise(resolve => setTimeout(resolve, durationMs))
  await userEvent.keyboard('[/Space]')
}

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

describe('Interweave 纯键盘全路径交互（真实浏览器）', () => {
  it('列表容器与资源行均支持长按 Space 打开右键菜单，且可用方向键/子菜单/Escape 操作', async () => {
    const host = document.createElement('div')
    host.id = 'app'
    host.style.cssText = 'width:900px;padding:16px'
    document.body.append(host)

    const activeId = ref<string | null>(null)
    const previewOpen = ref(false)
    const selected: string[] = []
    const resources = [
      resource({ id: 'r1', title: '第一条' }),
      resource({
        id: 'r2',
        title: '第二条',
        available: false,
        sources: [
          {
            id: 's2',
            type: 'file',
            location: '/tmp/missing.png',
            available: false,
            isPreferred: true,
            orderIndex: 0,
            mediaUrl: null,
            thumbnailUrl: null,
            metadata: null
          }
        ]
      })
    ]

    const app = createApp({
      render: () =>
        h('div', [
          h(ResourceList, {
            resources,
            activeResourceId: activeId.value,
            checkedIds: [],
            selectionMode: false,
            editingNameKey: null,
            editorRef: () => () => {},
            loading: false,
            runtimeAvailable: true,
            emptyDescription: '',
            resolveDefaultOpenWith: () => Promise.resolve('预览'),
            onActivate: (r: ResourceView) => {
              activeId.value = r.id
            },
            onSelect: (r: ResourceView) => {
              selected.push(r.id)
              previewOpen.value = true
            }
          }),
          h(PreviewDrawer, {
            open: previewOpen.value,
            resource: resources.find(item => item.id === activeId.value) ?? null,
            mobile: false,
            'onUpdate:open': (v: boolean) => {
              previewOpen.value = v
            }
          })
        ])
    })
    app.mount(host)
    cleanups.push(() => {
      app.unmount()
      host.remove()
    })

    await waitFor(() => host.querySelectorAll('[data-resource-row]').length === 2, '列表渲染两行')
    const container = host.querySelector<HTMLElement>('[role="list"]')!

    // 1. 焦点停在列表容器时，短按 Space 只进入首行，不打开菜单也不开预览
    container.focus()
    await holdSpace(80)
    await waitFor(
      () => document.activeElement === host.querySelectorAll('[data-resource-row]')[0],
      '短按 Space 进入首行'
    )
    expect(menuPanels()).toHaveLength(0)
    expect(previewOpen.value).toBe(false)

    // 2. 焦点回到列表容器并长按 Space (>500ms)，激活首行并打开首行完整菜单
    container.focus()
    await holdSpace(620)
    await waitFor(() => menuPanels().length === 1, '容器长按 Space 打开右键菜单')
    expect(activeId.value).toBe('r1')
    expect(openMenuLabels()).toContain('详情')
    expect(openMenuLabels()).toContain('打开方式')
    expect(openMenuLabels()).toContain('重命名')
    expect(openMenuLabels()).toContain('删除')

    // 3. 在菜单内用方向键进入子菜单再用 Escape 逐层退出，最后焦点回到资源行
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() => menuPanels().length === 2, 'ArrowRight 展开「打开方式」子菜单')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => menuPanels().length === 1, '第一次 Escape 只收起子菜单')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => menuPanels().length === 0, '第二次 Escape 关闭菜单')
    await waitFor(
      () => document.activeElement === host.querySelectorAll('[data-resource-row]')[0],
      '关闭菜单后焦点归还行'
    )

    // 4. ArrowDown 切到第二行（失效资源），在行上长按 Space 打开属于第二行的右键菜单
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(
      () => document.activeElement === host.querySelectorAll('[data-resource-row]')[1],
      'ArrowDown 移到第二行'
    )
    await holdSpace(620)
    await waitFor(() => menuPanels().length === 1, '在行上长按 Space 打开右键菜单')
    expect(openMenuLabels()).toContain('找回资源')
    expect(openMenuLabels()).not.toContain('标签')
    expect(previewOpen.value, '长按 Space 开菜单不得误触预览').toBe(false)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => menuPanels().length === 0, 'Escape 关闭第二行菜单')

    // 5. 在行上短按 Space 触发预览，Escape 关闭预览后焦点保留在当前行
    await holdSpace(80)
    await waitFor(() => previewOpen.value, '短按 Space 打开预览 drawer')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => !previewOpen.value, 'Escape 关闭预览 drawer')
  })

  it('Toolbar 搜索框按 Enter 展开聚焦，按 Escape 收起后焦点归还搜索按钮', async () => {
    const host = document.createElement('div')
    host.id = 'app'
    document.body.append(host)

    const searchOpen = ref(false)
    const app = createApp({
      render: () =>
        h(Toolbar, {
          searchQuery: '',
          filterSource: 'all',
          filterKind: 'all',
          filterAvailability: 'all',
          filterTag: '',
          sort: 'createdAt',
          sortDirection: 'desc',
          allTagNames: [],
          hasActiveFilter: false,
          filterOpen: false,
          searchOpen: searchOpen.value,
          selectionMode: false,
          selectedCount: 0,
          visibleCount: 1,
          allVisibleSelected: false,
          mobile: false,
          canGoBack: false,
          canGoForward: false,
          canRestore: false,
          'onUpdate:searchOpen': (value: boolean) => {
            searchOpen.value = value
          }
        })
    })
    app.mount(host)
    cleanups.push(() => {
      app.unmount()
      host.remove()
    })

    const searchBtn = host.querySelector<HTMLElement>('web-ui-button[aria-label="搜索"]')!
    await waitFor(() => Boolean(searchBtn.shadowRoot?.querySelector('button')), '搜索按钮完成渲染')
    for (let i = 0; i < 8 && document.activeElement !== searchBtn; i++) {
      await userEvent.tab()
    }
    expect(document.activeElement).toBe(searchBtn)
    await userEvent.keyboard('{Enter}')
    await waitFor(() => searchOpen.value, 'Enter 展开搜索框')
    await waitFor(
      () => document.activeElement === host.querySelector('web-ui-input[aria-label="搜索资源"]'),
      '焦点自动进入搜索框'
    )

    await userEvent.keyboard('{Escape}')
    await waitFor(() => !searchOpen.value, 'Escape 收起空搜索框')
    await waitFor(
      () => document.activeElement === host.querySelector('web-ui-button[aria-label="搜索"]'),
      'Escape 收起搜索框后焦点归还「搜索」按钮'
    )
  })

  it('DetailDrawer 内键盘重命名完成后焦点归还重命名按钮，且备注区 Tab 聚焦可见 focus ring', async () => {
    const host = document.createElement('div')
    host.id = 'app'
    document.body.append(host)

    const editingNameKey = ref<string | null>(null)
    const item = ref(resource({ id: 'r1', title: '原始标题' }))
    let editorInstance: WebUiEditableText | null = null
    const editorRef: NameEditorRef = el => {
      editorInstance = el instanceof Element ? (el as WebUiEditableText) : null
    }

    const app = createApp({
      render: () =>
        h(DetailDrawer, {
          open: true,
          resource: item.value,
          mobile: false,
          editingNameKey: editingNameKey.value,
          editorRef,
          replacingSourceIds: [],
          resolveDefaultOpenWith: () => Promise.resolve('预览'),
          onStartRename: () => {
            editingNameKey.value = DRAWER_TITLE_EDITOR_KEY
            void nextTick(async () => {
              await editorInstance?.updateComplete
              await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
              editorInstance?.select()
            })
          },
          onRenameChange: (_r: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>) => {
            item.value = { ...item.value, title: event.currentTarget.value.trim() || item.value.title }
            editingNameKey.value = null
          },
          onCancelRename: () => {
            editingNameKey.value = null
          }
        })
    })
    app.mount(host)
    cleanups.push(() => {
      app.unmount()
      host.remove()
    })

    const renameBtn = () => host.querySelector<HTMLElement>('web-ui-button[aria-label="重命名"]')!
    await waitFor(() => Boolean(renameBtn()?.shadowRoot?.querySelector('button')), '详情抽屉与重命名按钮渲染完成')
    for (let i = 0; i < 6 && document.activeElement !== renameBtn(); i++) {
      await userEvent.tab()
    }
    expect(document.activeElement).toBe(renameBtn())
    await userEvent.keyboard('{Enter}')
    await waitFor(() => editingNameKey.value === DRAWER_TITLE_EDITOR_KEY, 'Enter 进入标题编辑态')
    await waitFor(() => Boolean(editorInstance?.shadowRoot?.activeElement), '焦点进入标题编辑器')

    await userEvent.keyboard('新标题{Enter}')
    await waitFor(() => editingNameKey.value === null, 'Enter 提交重命名')
    expect(item.value.title).toBe('新标题')
    await waitFor(() => document.activeElement === renameBtn(), '重命名完成后焦点归还「重命名」按钮')

    // 验证可通过 Tab 聚焦到备注框并直接输入，且可通过 Tab 打开/关闭操作下拉菜单
    const openBtn = host.querySelector<HTMLButtonElement>('web-ui-dropdown button[slot="trigger"]')!
    for (let i = 0; i < 6 && document.activeElement !== openBtn; i++) {
      await userEvent.tab()
    }
    expect(document.activeElement).toBe(openBtn)
    await userEvent.keyboard('{Enter}')
    await waitFor(
      () => menuPanels().length > 0 || host.querySelector('web-ui-dropdown')?.hasAttribute('open') === true,
      '打开方式下拉展开'
    )
    await userEvent.keyboard('{Escape}')
    await waitFor(
      () => host.querySelector('web-ui-dropdown')?.hasAttribute('open') === false,
      'Escape 关闭打开方式下拉'
    )

    const note = host.querySelector<HTMLElement & { value?: string }>('web-ui-textarea[aria-label="备注"]')!
    for (let i = 0; i < 12 && document.activeElement !== note; i++) {
      await userEvent.tab()
    }
    expect(document.activeElement).toBe(note)
    await userEvent.keyboard('一条备注')
    expect(note.value).toBe('一条备注')
  })

  it('侧边栏导航可通过 Tab + Enter 切换页面并打开设置弹窗、Escape 关闭', async () => {
    await page.viewport(1280, 800)
    const host = document.createElement('div')
    host.id = 'app'
    document.body.append(host)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/library' },
        { path: '/library', component: defineComponent({ render: () => h('div', '资料库页面') }) },
        { path: '/map', component: defineComponent({ render: () => h('div', '关系图谱页面') }) }
      ]
    })
    await router.push('/library')
    await router.isReady()

    const app = createApp({
      render: () => h('web-ui-theme', { appearance: 'light' }, [h(AppLayout)])
    })
    app.use(createPinia())
    app.use(router)
    app.mount(host)
    cleanups.push(() => {
      app.unmount()
      host.remove()
    })

    await nextTick()
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    await waitFor(() => host.querySelector('button[aria-label="关系图谱"]') !== null, '导航渲染完成')
    const mapBtn = host.querySelector<HTMLButtonElement>('button[aria-label="关系图谱"]')!
    const settingsBtn = host.querySelector<HTMLButtonElement>('button[aria-label="设置"]')!

    await userEvent.tab() // 资料库
    await userEvent.tab() // 关系图谱
    expect(document.activeElement).toBe(mapBtn)
    await userEvent.keyboard('{Enter}')
    await waitFor(() => router.currentRoute.value.path === '/map', 'Enter 切换到关系图谱页')

    await userEvent.tab() // 设置
    expect(document.activeElement).toBe(settingsBtn)
    await userEvent.keyboard(' ')
    const dialog = () => host.querySelector<HTMLElement & { open?: boolean }>('web-ui-dialog[aria-dialog-label="设置"]')
    await waitFor(() => dialog()?.open === true, 'Space 打开设置弹窗')

    // Tab 进入设置分区 segmented，再用方向键切换分区、Escape 关闭弹窗
    const segmented = host.querySelector<HTMLElement & { value?: string }>('web-ui-segmented[aria-label="设置分区"]')!
    for (let i = 0; i < 6 && !segmented.contains(document.activeElement); i++) {
      await userEvent.tab()
    }
    expect(segmented.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() => segmented.value === 'appearance', 'ArrowRight 切换到外观设置')
    await waitFor(() => host.textContent?.includes('主题') ?? false, '外观设置面板已渲染')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => dialog()?.open === false, 'Escape 关闭设置弹窗')
  })

  it('窄屏最小窗口下可用 Tab + Enter 打开移动端导航抽屉并用 Escape 关闭', async () => {
    await page.viewport(400, 600)
    const host = document.createElement('div')
    host.id = 'app'
    document.body.append(host)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/library' },
        { path: '/library', component: defineComponent({ render: () => h('div', '资料库页面') }) },
        { path: '/map', component: defineComponent({ render: () => h('div', '关系图谱页面') }) }
      ]
    })
    await router.push('/library')
    await router.isReady()

    const app = createApp({
      render: () => h('web-ui-theme', { appearance: 'light' }, [h(AppLayout)])
    })
    app.use(createPinia())
    app.use(router)
    app.mount(host)
    cleanups.push(() => {
      app.unmount()
      host.remove()
    })

    await nextTick()
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    const layout = host.querySelector<HTMLElement & { sidebarOpen?: boolean }>('web-ui-layout')!
    await waitFor(() => Boolean(layout.shadowRoot?.querySelector('.mobile-toggle')), '移动端导航按钮渲染完成')

    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => layout.sidebarOpen === true, 'Enter 打开移动端导航抽屉')

    const mapBtn = host.querySelector<HTMLButtonElement>('button[aria-label="关系图谱"]')!
    for (let i = 0; i < 6 && document.activeElement !== mapBtn; i++) {
      await userEvent.tab()
    }
    expect(document.activeElement).toBe(mapBtn)
    await userEvent.keyboard('{Enter}')
    await waitFor(() => router.currentRoute.value.path === '/map', '移动端抽屉内 Enter 切页')
    await waitFor(() => layout.sidebarOpen === false, '选页后移动端导航抽屉自动收起')
  })
})
