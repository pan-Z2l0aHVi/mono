import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/context-menu'
import '@/components/dropdown-item'
import '@/components/theme'

import type { WebUiContextMenu } from '..'

interface ThemedHost extends HTMLElement {
  appearance: string
  updateComplete: Promise<unknown>
  getOverlayRoot(): HTMLElement | undefined
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

async function mountThemedMenu(appearance: 'light' | 'dark') {
  const theme = document.createElement('web-ui-theme') as ThemedHost
  theme.appearance = appearance
  document.body.append(theme)

  const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
  menu.innerHTML = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'
  theme.append(menu)
  await theme.updateComplete
  await menu.updateComplete
  return { theme, menu }
}

/**
 * 在**主题作用域内**把 token 落到计算色，作为面板应有的期望值。
 *
 * 写死 `rgb(...)` 会随 token 调整而腐化，也让「面板取到的是这个 token」退化成「面板取到的是
 * 这个字面量」；把同一 token 在同一作用域里边渲染出来对照，断言才真的在问「面板与它的主题
 * 是不是同一个值」。
 */
function resolveToken(theme: HTMLElement, token: string): string {
  const probe = document.createElement('div')
  probe.style.backgroundColor = `var(${token})`
  theme.append(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
}

/**
 * 全树（含 shadow root）找 scrim。
 *
 * 本文件的判据是**取到哪一份 token**，不是挂在哪个容器里 —— 容器归属由
 * `components/theme/__tests__/theme.spec.ts` 的 Context Menu 集成用例钉住。位置无关的
 * 查找才能让「把挂载点改回 document.body」这条反事实落在取色断言上，而不是落在
 * 「查不到元素」上。
 */
function findScrim(): HTMLDialogElement | null {
  const walk = (root: Document | ShadowRoot): HTMLDialogElement | null => {
    const direct = root.querySelector<HTMLDialogElement>('dialog[data-wui-menu-scrim]')
    if (direct) return direct
    for (const el of root.querySelectorAll('*')) {
      if (!el.shadowRoot) continue
      const found = walk(el.shadowRoot)
      if (found) return found
    }
    return null
  }
  return walk(document)
}

afterEach(() => document.body.replaceChildren())

/*
 * 深色外观下菜单仍是浅色玻璃的回归。
 *
 * 根因是 scrim 曾被挂到 `document.body`，而 `<web-ui-theme>` 是 body 的**子**节点：
 * `--wui-color-*` 只沿 DOM 树向下继承，scrim 与挂进 scrim 的面板双双落回
 * `var(--wui-color-*, <浅色字面量>)` 的 fallback。修复把 scrim 放进最近主题的 overlay root
 * （与 dropdown / select 同一条路径）。
 *
 * 判据只看计算色值：断言「在某个容器里」会让任何一次容器搬家伪装成通过，而这里要钉住的
 * 恰恰是取到了哪一份 token。反事实自证：把挂载点改回 `document.body` 时本文件两档都红在
 * 取色断言上。
 */
describe('context-menu 模态 scrim 的主题作用域（浏览器）', () => {
  for (const appearance of ['dark', 'light'] as const) {
    it(`${appearance} 外观下面板取最近主题的菜单 token，而不是浅色 fallback`, async () => {
      const { theme, menu } = await mountThemedMenu(appearance)
      menu.openAt(120, 120)
      await menu.updateComplete
      await nextFrame()

      const scrim = findScrim()
      expect(scrim).toBeTruthy()
      // `:modal` 只在 showModal() 真正生效时匹配：scrim 换了挂载点也不能把模态语义弄丢。
      expect(scrim?.matches(':modal')).toBe(true)

      const panel = scrim?.querySelector<HTMLElement>('[role="menu"]')
      expect(panel).toBeTruthy()

      // 主判据：面板的底与前景取的是**最近主题**那份 token，而不是浅色 fallback。
      const panelStyle = getComputedStyle(panel!)
      expect(panelStyle.backgroundColor).toBe(resolveToken(theme, '--wui-color-surface-menu'))
      expect(panelStyle.color).toBe(resolveToken(theme, '--wui-color-text'))

      // scrim 自己在作用域内：它继承得到主题 token，而不是空值 → 浅色 fallback。
      const scrimStyle = getComputedStyle(scrim!)
      expect(scrimStyle.getPropertyValue('--wui-color-surface-menu').trim()).not.toBe('')
      // 搬家不改变既定视觉裁定：scrim 元素与 ::backdrop 都保持纯透明（不压暗）。
      expect(scrimStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)')
      expect(getComputedStyle(scrim!, '::backdrop').backgroundColor).toBe('rgba(0, 0, 0, 0)')
    })
  }
})
