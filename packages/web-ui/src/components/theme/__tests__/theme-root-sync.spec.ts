import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import type { ThemeAppearance } from '..'
import { WebUiTheme } from '..'

/*
 * jsdom 不解析 shadow 树里的 `:host` 规则，所以用一份文档级夹具样式顶替组件内部 CSS 的
 * appearance → page 色映射：这里要验的是注册表的所有权、顺延与写入时机，token 的字面值由
 * theme-root-sync.browser.spec.ts 在真实 Chromium 上对 documentElement 实测。
 *
 * `appearance=system` 跟随系统配色翻转也归那份：它用真实 prefers-color-scheme 双向翻转，
 * 并先自检两档 page 色可分辨，比这里拿 matchMedia 桩断言查询串字面量（`queries` 里必须出现
 * `(prefers-color-scheme: dark)`，那是实现细节）更强。matchMedia 桩留给「卸载后系统配色
 * 翻转不再改写 root」那条行为用例：桩提供可翻转的 matches 与手动派发 change。
 */
const LIGHT_PAGE = '#ffffff'
const DARK_PAGE = '#242428'
const FIXTURE_PAGE = '#123456'
const FIXTURE_STYLE_ID = 'web-ui-theme-root-sync-fixture'

function readRootPage(): string {
  return document.documentElement.style.getPropertyValue('--wui-color-page')
}

async function mountTheme(appearance?: ThemeAppearance, parent: HTMLElement = document.body): Promise<WebUiTheme> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  if (appearance) theme.appearance = appearance
  parent.append(theme)
  await theme.updateComplete
  return theme
}

/** matchMedia 桩：记录 change 监听、matches 可翻转（flip 时手动派发给全部监听者）。 */
function stubMatchMedia() {
  const listeners = new Set<() => void>()
  let matches = false
  const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => {
      return {
        get matches() {
          return matches
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, handler: () => void) => listeners.add(handler),
        removeEventListener: (_type: string, handler: () => void) => listeners.delete(handler),
        dispatchEvent: () => false
      } as unknown as MediaQueryList
    }
  })
  return {
    /** 翻转系统配色档位并派发 change：模拟 prefers-color-scheme 翻转。 */
    flip() {
      matches = !matches
      for (const handler of Array.from(listeners)) handler()
    },
    restore() {
      if (descriptor) Object.defineProperty(window, 'matchMedia', descriptor)
      else Reflect.deleteProperty(window, 'matchMedia')
    }
  }
}

beforeEach(() => {
  const style = document.createElement('style')
  style.id = FIXTURE_STYLE_ID
  style.textContent = `
    web-ui-theme[appearance='light'], web-ui-theme[resolved-appearance='light'] { --wui-color-page: ${LIGHT_PAGE}; }
    web-ui-theme[appearance='dark'], web-ui-theme[resolved-appearance='dark'] { --wui-color-page: ${DARK_PAGE}; }
  `
  document.head.append(style)
})

afterEach(() => {
  // 主题逐个移除，让注册表自己走 disconnectedCallback 的对账路径。
  for (const theme of Array.from(document.querySelectorAll('web-ui-theme'))) theme.remove()
  document.getElementById(FIXTURE_STYLE_ID)?.remove()
  document.documentElement.style.removeProperty('--wui-color-page')
  document.documentElement.style.removeProperty('--wui-scrollbar-handle')
})

describe('WebUiTheme 根节点 page 色同步', () => {
  it('单个根主题连接后把 page 色写到 documentElement', async () => {
    await mountTheme('light')
    expect(readRootPage()).toBe(LIGHT_PAGE)

    const dark = await mountTheme('dark')
    expect(readRootPage()).toBe(LIGHT_PAGE)
    dark.remove()
  })

  it('appearance 切换后 root 值实时更新', async () => {
    const theme = await mountTheme('light')
    expect(readRootPage()).toBe(LIGHT_PAGE)

    theme.appearance = 'dark'
    await theme.updateComplete
    expect(readRootPage()).toBe(DARK_PAGE)

    theme.appearance = 'light'
    await theme.updateComplete
    expect(readRootPage()).toBe(LIGHT_PAGE)
  })

  it('appearance 延后设置时，激活那一刻才登记并写入', async () => {
    const theme = document.createElement('web-ui-theme') as WebUiTheme
    document.body.append(theme)
    await theme.updateComplete
    expect(readRootPage()).toBe('')

    theme.appearance = 'dark'
    await theme.updateComplete
    expect(readRootPage()).toBe(DARK_PAGE)
  })

  it('appearance 被清空时撤销登记，同步权顺延给下一个实例', async () => {
    const first = await mountTheme('light')
    const second = await mountTheme('dark')
    expect(readRootPage()).toBe(LIGHT_PAGE)

    first.appearance = undefined
    await first.updateComplete
    expect(readRootPage()).toBe(DARK_PAGE)
    second.remove()
  })

  it('嵌套主题只跟随最外层：内层切换不影响 root', async () => {
    const outer = await mountTheme('light')
    const inner = await mountTheme('dark', outer)
    expect(readRootPage()).toBe(LIGHT_PAGE)

    inner.appearance = 'light'
    await inner.updateComplete
    expect(readRootPage()).toBe(LIGHT_PAGE)

    outer.appearance = 'dark'
    await outer.updateComplete
    expect(readRootPage()).toBe(DARK_PAGE)
  })

  it('slot 内嵌套同样按 connect 顺序判最外层', async () => {
    const outer = await mountTheme('light')
    const slot = document.createElement('div')
    outer.append(slot)
    const inner = await mountTheme('dark', slot)
    expect(readRootPage()).toBe(LIGHT_PAGE)

    inner.appearance = 'light'
    await inner.updateComplete
    expect(readRootPage()).toBe(LIGHT_PAGE)

    outer.appearance = 'dark'
    await outer.updateComplete
    expect(readRootPage()).toBe(DARK_PAGE)
  })

  it('最外层断开后同步权顺延给下一个已连接实例', async () => {
    const outer = await mountTheme('light')
    const inner = await mountTheme('dark', outer)
    expect(readRootPage()).toBe(LIGHT_PAGE)

    // 内层先移出外层：它仍然连着，只是按新的一次 connect 排到队尾。
    document.body.append(inner)
    expect(readRootPage()).toBe(LIGHT_PAGE)

    outer.remove()
    expect(readRootPage()).toBe(DARK_PAGE)
  })

  it('两个并列主题：先连接的那个断开后由后者接管', async () => {
    const first = await mountTheme('light')
    const second = await mountTheme('dark')
    expect(readRootPage()).toBe(LIGHT_PAGE)

    first.remove()
    expect(readRootPage()).toBe(DARK_PAGE)

    second.remove()
    // 全部断开：保留最后值，避免 body 背景闪回 UA 白底。
    expect(readRootPage()).toBe(DARK_PAGE)
  })

  it('整棵子树一起卸载时保留最后值', async () => {
    const outer = await mountTheme('light')
    await mountTheme('dark', outer)
    outer.remove()
    expect(readRootPage()).toBe(LIGHT_PAGE)
  })

  /*
   * SPA 换路由的形状：旧主题整棵卸载（root 值保留），新页面挂上新主题。
   * 新主题必须夺回同步权并覆写保留值，否则页面会停在上一个路由的主题色上。
   */
  it('全部卸载后新挂载的主题夺回同步权', async () => {
    const first = await mountTheme('dark')
    first.remove()
    expect(readRootPage()).toBe(DARK_PAGE)

    const second = await mountTheme('light')
    expect(readRootPage()).toBe(LIGHT_PAGE)
  })

  /*
   * 监听器记账（P2-4）换成行为等价断言：数到的「1 → 0」只证记账，不证后果。这里走行为——
   * 挂载期间系统配色翻转改写 root；最后一个 theme 卸载后，同样的翻转不再改写 root
   * （保留最后值），这正是「监听被移除」的用户可见后果。若监听泄漏，flip 会把 root 翻回去。
   */
  it('最后一个 theme 卸载后，系统配色翻转不再改写 root', async () => {
    const stub = stubMatchMedia()
    try {
      const theme = await mountTheme('system')
      expect(readRootPage()).toBe(LIGHT_PAGE)

      stub.flip()
      await theme.updateComplete
      expect(readRootPage()).toBe(DARK_PAGE)

      theme.remove()
      stub.flip()
      await Promise.resolve()
      expect(readRootPage(), '卸载后翻转不应改写 root（保留最后值）').toBe(DARK_PAGE)
    } finally {
      stub.restore()
    }
  })

  /*
   * 镜像取的是计算值，因此 host 上的覆盖优先于主题自身定义。运行中改覆盖不触发 Lit 更新，
   * 由随后的 appearance 变更带上：同步的触发点就是 connect / appearance / 系统配色翻转。
   */
  it('消费者在 host 上覆盖的 page 色按计算值镜像', async () => {
    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.appearance = 'light'
    theme.style.setProperty('--wui-color-page', FIXTURE_PAGE)
    document.body.append(theme)
    await theme.updateComplete
    expect(readRootPage()).toBe(FIXTURE_PAGE)

    theme.style.setProperty('--wui-color-page', LIGHT_PAGE)
    theme.appearance = 'dark'
    await theme.updateComplete
    expect(readRootPage()).toBe(LIGHT_PAGE)
  })

  /*
   * README 承诺的限制面：组件不观察 host 自身的样式变化，运行中改 host 上的
   * --wui-color-page 不会实时镜像，要等下一个写入触发点。同值重新赋值 appearance
   * 也不算触发点——Lit 对未变化的值直接放弃本次更新。
   */
  it('运行中改 host 覆盖不实时镜像，要等下一次 appearance 变化', async () => {
    const theme = await mountTheme('light')
    expect(readRootPage()).toBe(LIGHT_PAGE)

    theme.style.setProperty('--wui-color-page', FIXTURE_PAGE)
    await theme.updateComplete
    expect(readRootPage()).toBe(LIGHT_PAGE)

    theme.appearance = 'light'
    await theme.updateComplete
    // 同值重新赋值不算触发点：Lit 放弃本次更新，root 值保持不动。
    expect(readRootPage()).toBe(LIGHT_PAGE)

    theme.appearance = 'dark'
    await theme.updateComplete
    expect(readRootPage()).toBe(FIXTURE_PAGE)
  })

  /*
   * 同步只写「值变了」的 token：同值重写会让 documentElement 每次主题更新都做一次无谓的
   * 样式失效。按 P2-4 换成行为等价的值断言（原 spy 计数是写入内部锚）：触发一次与 page
   * 无关的更新（motion 变化），root 上的 page 色保持原值。
   */
  it('值未变化时 root 计算值不变', async () => {
    const theme = await mountTheme('light')
    const before = readRootPage()
    expect(before).toBe(LIGHT_PAGE)

    const setter = vi.spyOn(document.documentElement.style, 'setProperty')
    try {
      theme.motion = 'reduced'
      await theme.updateComplete
      expect(readRootPage()).toBe(before)
      expect(setter).not.toHaveBeenCalledWith('--wui-color-page', expect.anything())
    } finally {
      setter.mockRestore()
    }
  })
})
