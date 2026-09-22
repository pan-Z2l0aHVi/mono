import { afterEach, describe, expect, it } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser'

import type { ThemeAppearance, ThemeMotion } from '..'
import '..'

/*
 * 真实 Chromium 上的 documentElement 实测：token 字面值来自组件自身 CSS（:host 块），
 * 不经过 jsdom 的样式解析，因此这里断言的是「写进 documentElement 的值确实等于主题的
 * page 色」，以及消费方那一行 body 规则真的把背景（含 overscroll 区）交给该 token。
 * 注册表的所有权与顺延由 theme-root-sync.spec.ts 覆盖，这里只取最外层相关的几条。
 */
const LIGHT_PAGE = '#fff'
const DARK_PAGE = '#242628'
const LIGHT_RGB = 'rgb(255, 255, 255)'
const DARK_RGB = 'rgb(36, 38, 40)'
const OVERRIDE_PAGE = '#123456'

interface CdpSession {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>
}

function readRootPage(): string {
  return document.documentElement.style.getPropertyValue('--wui-color-page')
}

function bodyBackground(): string {
  return getComputedStyle(document.body).backgroundColor
}

/** 消费方契约：一行 body 规则，让 overscroll 区域跟随主题色。 */
function applyBodyRule(): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = 'body { background: var(--wui-color-page); }'
  document.head.append(style)
  return style
}

async function mountTheme(
  appearance: ThemeAppearance,
  parent: HTMLElement = document.body,
  motion: ThemeMotion = 'reduced'
): Promise<HTMLElementTagNameMap['web-ui-theme']> {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', appearance)
  theme.setAttribute('motion', motion)
  parent.append(theme)
  await theme.updateComplete
  return theme
}

async function emulateColorScheme(value: 'light' | 'dark'): Promise<void> {
  const session = cdp() as unknown as CdpSession
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] })
}

async function waitForRootPage(expected: string): Promise<void> {
  const deadline = performance.now() + 2000
  while (performance.now() < deadline) {
    if (readRootPage() === expected) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(`root page color did not become ${expected}, still ${readRootPage()}`)
}

afterEach(async () => {
  document.body.replaceChildren()
  for (const style of Array.from(document.querySelectorAll('style[data-root-sync-fixture]'))) style.remove()
  document.documentElement.style.removeProperty('--wui-color-page')
  await emulateColorScheme('light')
})

describe('theme 根节点 page 色同步（浏览器）', () => {
  it('单个根主题把 page 色写进 documentElement，body 规则据此取色', async () => {
    const bodyRule = applyBodyRule()
    bodyRule.setAttribute('data-root-sync-fixture', '')
    await mountTheme('light')

    expect(readRootPage()).toBe(LIGHT_PAGE)
    expect(bodyBackground()).toBe(LIGHT_RGB)
  })

  it('appearance 切换后 root 值与 body 背景同步更新', async () => {
    const bodyRule = applyBodyRule()
    bodyRule.setAttribute('data-root-sync-fixture', '')
    const theme = await mountTheme('light')
    expect(bodyBackground()).toBe(LIGHT_RGB)

    theme.setAttribute('appearance', 'dark')
    await theme.updateComplete
    expect(readRootPage()).toBe(DARK_PAGE)
    expect(bodyBackground()).toBe(DARK_RGB)
  })

  it('appearance=system 跟随系统配色翻转', async () => {
    const theme = await mountTheme('system')
    expect(readRootPage()).toBe(LIGHT_PAGE)

    await emulateColorScheme('dark')
    await waitForRootPage(DARK_PAGE)

    await emulateColorScheme('light')
    await waitForRootPage(LIGHT_PAGE)
    theme.remove()
  })

  it('嵌套主题只跟随最外层', async () => {
    const outer = await mountTheme('light')
    const inner = await mountTheme('dark', outer)
    expect(readRootPage()).toBe(LIGHT_PAGE)

    inner.setAttribute('appearance', 'light')
    await inner.updateComplete
    expect(readRootPage()).toBe(LIGHT_PAGE)

    outer.setAttribute('appearance', 'dark')
    await outer.updateComplete
    expect(readRootPage()).toBe(DARK_PAGE)
  })

  it('最外层断开后由仍连接的内层接管 root 值', async () => {
    const outer = await mountTheme('light')
    const inner = await mountTheme('dark', outer)
    expect(readRootPage()).toBe(LIGHT_PAGE)

    document.body.append(inner)
    outer.remove()
    expect(readRootPage()).toBe(DARK_PAGE)
  })

  it('全部断开后保留最后值', async () => {
    const theme = await mountTheme('dark')
    expect(readRootPage()).toBe(DARK_PAGE)

    theme.remove()
    expect(readRootPage()).toBe(DARK_PAGE)
  })

  it('host 上的覆盖按计算值镜像到 root', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    theme.style.setProperty('--wui-color-page', OVERRIDE_PAGE)
    document.body.append(theme)
    await theme.updateComplete
    expect(readRootPage()).toBe(OVERRIDE_PAGE)
  })

  /*
   * README 建议的消费方式：页面色要独立于主题 appearance 变化时，消费者自己在 :root 上
   * 持该变量。重要声明在层级上压过本模块写在 documentElement 上的行内值，因此它真的能
   * 把回弹区的颜色拿走——这条逃生口必须由真实浏览器的层级计算来证明。
   */
  it('消费者自己的 !important 声明压过镜像的行内值', async () => {
    const bodyRule = applyBodyRule()
    bodyRule.setAttribute('data-root-sync-fixture', '')
    await mountTheme('light')
    expect(bodyBackground()).toBe(LIGHT_RGB)

    const own = document.createElement('style')
    own.setAttribute('data-root-sync-fixture', '')
    own.textContent = `:root { --wui-color-page: ${OVERRIDE_PAGE} !important; }`
    document.head.append(own)

    // 行内值仍在（同步权仍归组件），但重要声明在计算层级上胜出。
    expect(readRootPage()).toBe(LIGHT_PAGE)
    expect(getComputedStyle(document.documentElement).getPropertyValue('--wui-color-page')).toBe(OVERRIDE_PAGE)
    expect(bodyBackground()).toBe('rgb(18, 52, 86)')
  })
})
