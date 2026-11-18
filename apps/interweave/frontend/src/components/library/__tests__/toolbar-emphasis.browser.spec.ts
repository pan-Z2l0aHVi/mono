// 工具栏图标强调色的行为面（B9）：筛选生效时筛选图标的颜色取 accent token，无筛选时回到
// 继承色。这条表面此前全仓没有行为级覆盖（color-states.browser.spec.ts 量的是行底色，
// 是另一张表面）；旧断言钉的是图标 class 文本里的 token 名，那是接线不是颜色。
// 强调 class 是应用层 Tailwind arbitrary property，必须先加载全局样式表。
import '@/assets/global.css'
import '@greypan/web-ui'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { AvailabilityFilter, ResourceKind, SortOption } from '../../../stores/library'
import Toolbar from '../Toolbar.vue'

const hosts: HTMLElement[] = []
const apps: { unmount: () => void }[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

interface ToolbarProps {
  filterSource: string
  filterKind: ResourceKind | 'all'
  filterAvailability: AvailabilityFilter
  filterTag: string
}

async function mountToolbar(props: ToolbarProps) {
  const host = document.createElement('div')
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  theme.append(host)
  document.body.append(theme)
  hosts.push(theme)
  const app = createApp({
    setup() {
      return () =>
        h(Toolbar, {
          searchQuery: '',
          filterSource: props.filterSource,
          filterKind: props.filterKind,
          filterAvailability: props.filterAvailability,
          filterTag: props.filterTag,
          sort: 'name' satisfies SortOption,
          sortDirection: 'asc',
          allTagNames: [],
          hasActiveFilter:
            props.filterSource !== 'all' ||
            props.filterKind !== 'all' ||
            props.filterAvailability !== 'all' ||
            props.filterTag !== '',
          filterOpen: false,
          searchOpen: false,
          selectionMode: false,
          selectedCount: 0,
          visibleCount: 3,
          allVisibleSelected: false,
          mobile: false,
          canGoBack: false,
          canGoForward: false,
          canRestore: false
        })
    }
  })
  apps.push(app)
  app.mount(host)
  await nextTick()
  const button = host.querySelector<HTMLElement>('web-ui-button[aria-label="筛选和排序"]')!
  const icon = button.querySelector('web-ui-icon')!
  await icon.updateComplete
  return { icon, theme }
}

/** 把 token 在主题作用域里落到计算色，作为期望值（不写死 rgb 字面量）。 */
function accentColor(theme: HTMLElement): string {
  const probe = document.createElement('span')
  probe.style.color = 'var(--wui-color-accent)'
  theme.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

function iconColor(icon: HTMLElement): string {
  const svg = icon.shadowRoot?.querySelector('svg')
  if (!svg) throw new Error('筛选图标未渲染 svg')
  return getComputedStyle(svg).color
}

describe('Toolbar 筛选图标的强调色（真实浏览器）', () => {
  it('筛选生效时图标取 accent token，无筛选时回到继承色', async () => {
    const active = await mountToolbar({
      filterSource: 'file',
      filterKind: 'all',
      filterAvailability: 'all',
      filterTag: ''
    })
    expect(iconColor(active.icon), '筛选生效：强调色应取 accent token').toBe(accentColor(active.theme))

    const inactive = await mountToolbar({
      filterSource: 'all',
      filterKind: 'all',
      filterAvailability: 'all',
      filterTag: ''
    })
    expect(iconColor(inactive.icon), '无筛选：不应强调成 accent').not.toBe(accentColor(inactive.theme))
    // 继承色的后果：与旁边「选择」文字按钮的图标同色（同一条继承链），强调只在筛选时发生。
  })
})
