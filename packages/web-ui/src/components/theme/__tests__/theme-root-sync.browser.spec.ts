import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser'

import { pollUntil } from '@/shared/test-utils'

import type { ThemeAppearance, ThemeMotion } from '..'

/*
 * 真实 Chromium 上的 documentElement 实测：token 只有在真实样式引擎里才算得出计算值，
 * body 那条消费规则也只有在这里才真的取到色。注册表的所有权与顺延由
 * theme-root-sync.spec.ts 覆盖，这里只取「镜像出来的计算值」相关的几条。
 *
 * 判据全部走关系：root 上结算出的页面色必须等于主题作用域里同一枚 token 的页面色。
 * 把 `#fff` / `rgb(36, 38, 40)` 这类调色板字面量抄进用例会随主题改色一起腐化，而改色本身
 * 是设计决策，没有用例该为它买单；token 层的真实维护风险（fallback 与定义、dark 与媒体块
 * 成对同步）由 theme-token-parity.spec.ts 锁。
 *
 * 两种表示不能混比：计算值读取对自定义属性返回声明文本（`#fff`），而把它落到
 * color/background 上读回的是 rgb。下面的用例只在同一种表示内比对。
 */
const OVERRIDE_PAGE = '#123456'

interface CdpSession {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>
}

/** 作用域里 `--wui-color-page` 结算出的颜色：继承、媒体查询与重要声明都在这里生效。 */
function pageColor(scope: Element): string {
  const probe = document.createElement('span')
  probe.style.color = 'var(--wui-color-page)'
  scope.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

/** root 侧的页面色：body 不被任何主题包住，因此它读到的就是 documentElement 上结算的值。 */
function rootPageColor(): string {
  return pageColor(document.body)
}

/** 元素上这枚 token 的声明文本，用于和组件写进 documentElement 的行内值逐字比对。 */
function pageToken(scope: Element): string {
  return getComputedStyle(scope).getPropertyValue('--wui-color-page').trim()
}

/** 组件镜像到根节点的那条行内声明。 */
function mirroredInlineToken(): string {
  return document.documentElement.style.getPropertyValue('--wui-color-page').trim()
}

function readRootScrollbarHandle(): string {
  return document.documentElement.style.getPropertyValue('--wui-scrollbar-handle')
}

/** 消费方契约：文档级 scrollbar 读镜像到 `html` 的 thumb token。 */
function applyHtmlScrollbarRule(): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = 'html { scrollbar-color: var(--wui-scrollbar-handle) transparent; }'
  style.setAttribute('data-root-sync-fixture', '')
  document.head.append(style)
  return style
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

/*
 * 系统配色翻转后，主题的 :host 值由 matchMedia 回调驱动，与 root 镜像之间存在一次渲染间隔，
 * 因此「跟上」要轮询而不是当场读。判据是 root 等于主题当前结算色，且确实离开了原来的色。
 */
async function waitForRootToFollowHost(theme: Element, leftBehind: string): Promise<void> {
  await pollUntil(
    () => {
      const current = pageColor(theme)
      return rootPageColor() === current && current !== leftBehind
    },
    () => `root 页面色没有跟上主题，仍是 ${rootPageColor()}，主题为 ${pageColor(theme)}`
  )
}

afterEach(async () => {
  document.body.replaceChildren()
  for (const style of Array.from(document.querySelectorAll('style[data-root-sync-fixture]'))) style.remove()
  document.documentElement.style.removeProperty('--wui-color-page')
  document.documentElement.style.removeProperty('--wui-scrollbar-handle')
  await emulateColorScheme('light')
})

describe('theme 根节点 page 色同步（浏览器）', () => {
  it('单个根主题：root 计算值等于主题的 page 色，body 规则据此取色', async () => {
    const bodyRule = applyBodyRule()
    bodyRule.setAttribute('data-root-sync-fixture', '')
    const theme = await mountTheme('light')

    expect(rootPageColor(), 'root 应结算出主题作用域里的 page 色').toBe(pageColor(theme))
    expect(bodyBackground(), 'body 背景应取到同一枚镜像值').toBe(pageColor(theme))
  })

  it('scrollbar thumb token 一并镜像到 documentElement，html 规则据此取色', async () => {
    applyHtmlScrollbarRule()
    const theme = await mountTheme('light')

    // 镜像值必须等于主题自己的计算值；自定义属性的序列化形态（Chromium 落成短 hex）不属于契约。
    // 消费方看到的是 `scrollbar-color` 解析后的颜色，那一层单独断言。
    expect(readRootScrollbarHandle()).toBe(getComputedStyle(theme).getPropertyValue('--wui-scrollbar-handle').trim())
    expect(getComputedStyle(document.documentElement).scrollbarColor).toContain('rgba(0, 0, 0, 0.39)')

    theme.setAttribute('appearance', 'dark')
    await theme.updateComplete
    expect(readRootScrollbarHandle()).toBe(getComputedStyle(theme).getPropertyValue('--wui-scrollbar-handle').trim())
    expect(getComputedStyle(document.documentElement).scrollbarColor).toContain('rgba(255, 255, 255, 0.5)')
  })

  it('appearance 切换后 root 值与 body 背景同步更新', async () => {
    const bodyRule = applyBodyRule()
    bodyRule.setAttribute('data-root-sync-fixture', '')
    const theme = await mountTheme('light')
    const lightPage = pageColor(theme)
    expect(bodyBackground()).toBe(lightPage)

    theme.setAttribute('appearance', 'dark')
    await theme.updateComplete
    const darkPage = pageColor(theme)
    // 两档必须真的读出不一样颜色，否则「同步更新」是同值也能过的空断言。
    expect(darkPage, 'light 与 dark 的 page 色应能分辨').not.toBe(lightPage)
    expect(rootPageColor()).toBe(darkPage)
    expect(bodyBackground()).toBe(darkPage)
  })

  it('appearance=system 跟随系统配色翻转', async () => {
    const theme = await mountTheme('system')
    await waitForRootToFollowHost(theme, '')
    const lightPage = pageColor(theme)
    expect(rootPageColor(), 'root 应结算出系统浅色档的页面色').toBe(lightPage)

    await emulateColorScheme('dark')
    await waitForRootToFollowHost(theme, lightPage)
    const darkPage = pageColor(theme)
    expect(darkPage, '两档 page 色若相同，本用例没有区分力').not.toBe(lightPage)
    expect(rootPageColor(), '系统切到深色后 root 应跟着换档').toBe(darkPage)

    await emulateColorScheme('light')
    await waitForRootToFollowHost(theme, darkPage)
    expect(rootPageColor(), '系统回到浅色后 root 应跟着回到浅色档').toBe(lightPage)
    theme.remove()
  })

  it('嵌套主题只跟随最外层', async () => {
    const outer = await mountTheme('light')
    const inner = await mountTheme('dark', outer)
    // 内外两档的页面色必须可分辨，否则「只跟随最外层」是同值也能过的空断言。
    expect(pageColor(inner), 'inner(dark) 与 outer(light) 的 page 色应能分辨').not.toBe(pageColor(outer))
    expect(rootPageColor()).toBe(pageColor(outer))

    // 内层改成与外层同色后再把外层推向另一档：最后一步 root 必须落在外层那一档，
    // 而此时内层是另一档，这才说明跟随的是最外层而不是内层。
    inner.setAttribute('appearance', 'light')
    await inner.updateComplete
    expect(rootPageColor()).toBe(pageColor(outer))

    outer.setAttribute('appearance', 'dark')
    await outer.updateComplete
    expect(rootPageColor()).toBe(pageColor(outer))
    expect(pageColor(inner), '此时内层是另一档，root 没有跟它走').not.toBe(rootPageColor())
  })

  it('最外层断开后由仍连接的内层接管 root 值', async () => {
    const outer = await mountTheme('light')
    const inner = await mountTheme('dark', outer)
    expect(rootPageColor()).toBe(pageColor(outer))

    document.body.append(inner)
    outer.remove()
    expect(rootPageColor(), 'root 应改跟随仍连接的内层').toBe(pageColor(inner))
  })

  it('全部断开后保留最后值', async () => {
    const theme = await mountTheme('dark')
    const last = rootPageColor()
    expect(last).toBe(pageColor(theme))

    theme.remove()
    expect(rootPageColor(), '全部断开后 root 保留最后一次的页面色，不闪回 UA 默认底').toBe(last)
  })

  it('host 上的覆盖按计算值镜像到 root', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    theme.style.setProperty('--wui-color-page', OVERRIDE_PAGE)
    document.body.append(theme)
    await theme.updateComplete

    expect(rootPageColor()).toBe(pageColor(theme))
  })

  /*
   * README 建议的消费方式：页面色要独立于主题 appearance 变化时，消费者自己在 :root 上
   * 持该变量。重要声明在层级上压过本模块写在 documentElement 上的行内值，因此它真的能
   * 把回弹区的颜色拿走——这条逃生口必须由真实浏览器的层级计算来证明。
   */
  it('消费者自己的 !important 声明压过镜像的行内值', async () => {
    const bodyRule = applyBodyRule()
    bodyRule.setAttribute('data-root-sync-fixture', '')
    const theme = await mountTheme('light')
    const themeToken = pageToken(theme)
    const themePage = pageColor(theme)
    expect(bodyBackground()).toBe(themePage)

    const own = document.createElement('style')
    own.setAttribute('data-root-sync-fixture', '')
    own.textContent = `:root { --wui-color-page: ${OVERRIDE_PAGE} !important; }`
    document.head.append(own)

    // 行内声明仍是主题的色（同步权没被拿走），但 root 计算层上重要声明胜出。
    expect(mirroredInlineToken(), '组件应仍在往 documentElement 写镜像值').toBe(themeToken)
    expect(pageToken(document.documentElement), '计算值应由消费者的声明接管').not.toBe(themeToken)
    const overridden = rootPageColor()
    expect(overridden, '消费者的重要声明应压过镜像值').not.toBe(themePage)
    expect(bodyBackground(), 'body 应跟着消费者的页面色走').toBe(overridden)
  })
})
