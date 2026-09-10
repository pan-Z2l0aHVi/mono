import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '..'
import '@/components/autocomplete'
import '@/components/avatar'
import '@/components/button'
import '@/components/button-group'
import '@/components/checkbox'
import '@/components/dialog'
import '@/components/drawer'
import '@/components/empty'
import '@/components/layout'
import '@/components/select'
import '@/components/slider'
import '@/components/switch'
import '@/components/textarea'
import '@/components/toast'
import type { WebUiDialog } from '@/components/dialog'
import type { WebUiDrawer } from '@/components/drawer'
import type { WebUiLayout } from '@/components/layout'
import type { WebUiTheme } from '@/components/theme'
import type { WebUiToast } from '@/components/toast'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function createTheme(style?: Record<string, string>): WebUiTheme {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  if (style) Object.assign(theme.style, style)
  document.body.append(theme)
  return theme
}

function inner(el: HTMLElement, selector: string): HTMLElement {
  const found = el.shadowRoot?.querySelector<HTMLElement>(selector)
  if (!found) throw new Error(`missing ${selector}`)
  return found
}

async function waitForInner(el: HTMLElement, selector: string, absentSelector?: string): Promise<HTMLElement> {
  const deadline = Date.now() + 500
  do {
    const found = el.shadowRoot?.querySelector<HTMLElement>(selector)
    if (found && (absentSelector === undefined || !el.shadowRoot?.querySelector(absentSelector))) return found
    await nextFrame()
  } while (Date.now() < deadline)
  throw new Error(`timeout waiting for ${selector}`)
}

function waitForLayoutShell(el: WebUiLayout, mode: 'desktop' | 'mobile'): Promise<HTMLElement> {
  if (mode === 'desktop') return waitForInner(el, 'aside .aside-panel', '.wui-drawer-body')
  return waitForMobileDrawerShell(el)
}

async function waitForMobileDrawerShell(el: WebUiLayout): Promise<HTMLElement> {
  const deadline = Date.now() + 500
  do {
    const drawer = el.shadowRoot?.querySelector('web-ui-drawer') as HTMLElement | null
    const found = drawer?.shadowRoot?.querySelector<HTMLElement>('.wui-drawer-body')
    if (found && !el.shadowRoot?.querySelector('aside .aside-panel')) return found
    await nextFrame()
  } while (Date.now() < deadline)
  throw new Error('timeout waiting for mobile drawer shell')
}

function radius(el: HTMLElement): string {
  return getComputedStyle(el).borderTopLeftRadius
}

function cssVar(el: HTMLElement, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim()
}

afterEach(async () => {
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

describe('语义 radius token（浏览器）', () => {
  it('theme 定义三个语义 radius token', async () => {
    const theme = createTheme()
    await theme.updateComplete

    expect(cssVar(theme, '--wui-radius-control')).toBe('calc(infinity * 1px)')
    expect(cssVar(theme, '--wui-radius-menu')).toBe('18px')
    expect(cssVar(theme, '--wui-radius-overlay')).toBe('28px')
  })

  it('pill 控件使用 --wui-radius-control，且可被 token 覆盖', async () => {
    const theme = createTheme()
    const button = document.createElement('web-ui-button')
    button.textContent = 'Go'
    theme.append(button)
    await button.updateComplete

    // calc(infinity * 1px) 序列化后仍是超长胶囊值，而非具体 px
    expect(parseFloat(radius(inner(button, 'button')))).toBeGreaterThan(1e6)

    theme.style.setProperty('--wui-radius-control', '9px')
    expect(radius(inner(button, 'button'))).toBe('9px')
  })

  it('pill glass corner 保持各控件尺寸派生的有限值，不随语义 radius 覆盖', async () => {
    const theme = createTheme()
    const button = document.createElement('web-ui-button')
    button.variant = 'glass'
    button.textContent = 'Go'
    const select = document.createElement('web-ui-select')
    const autocomplete = document.createElement('web-ui-autocomplete')
    const buttonGroup = document.createElement('web-ui-button-group')
    const slider = document.createElement('web-ui-slider')
    const sw = document.createElement('web-ui-switch')
    const avatar = document.createElement('web-ui-avatar')
    avatar.size = 48
    const squareAvatar = document.createElement('web-ui-avatar')
    squareAvatar.shape = 'square'
    theme.append(button, select, autocomplete, buttonGroup, slider, sw, avatar, squareAvatar)
    await Promise.all(
      [button, select, autocomplete, buttonGroup, slider, sw, avatar, squareAvatar].map(el => el.updateComplete)
    )

    const buttonEl = inner(button, 'button')
    expect(cssVar(buttonEl, '--wui-glass-corner-radius')).toBe('calc(36px / 2)')
    expect(cssVar(inner(select, '.select-trigger'), '--wui-glass-corner-radius')).toBe('calc(36px / 2)')
    expect(cssVar(inner(autocomplete, '.input-wrapper'), '--wui-glass-corner-radius')).toBe('calc(36px / 2)')
    expect(cssVar(inner(buttonGroup, '.wui-button-group-inner'), '--wui-glass-corner-radius')).toBe('calc(36px / 2)')
    expect(cssVar(inner(slider, '.wui-slider-thumb'), '--wui-glass-corner-radius')).toBe('calc(min(30px, 20px) / 2)')
    expect(cssVar(inner(avatar, '.avatar-inner'), '--wui-glass-corner-radius')).toBe('calc(48px / 2)')
    expect(cssVar(inner(squareAvatar, '.avatar-inner'), '--wui-glass-corner-radius')).toBe('12px')

    const track = inner(sw, '.wui-switch-track')
    track.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, pointerId: 1, clientX: 10, clientY: 10 })
    )
    await sw.updateComplete
    const switchThumb = inner(sw, '.wui-switch-thumb')
    expect(switchThumb.classList.contains('wui-glass')).toBe(true)
    expect(cssVar(switchThumb, '--wui-glass-corner-radius')).toBe('calc(16px / 2)')

    theme.style.setProperty('--wui-radius-control', '4px')
    theme.style.setProperty('--wui-radius-menu', '4px')
    expect(cssVar(buttonEl, '--wui-glass-corner-radius')).toBe('calc(36px / 2)')
    expect(cssVar(inner(select, '.select-trigger'), '--wui-glass-corner-radius')).toBe('calc(36px / 2)')
    expect(cssVar(inner(autocomplete, '.input-wrapper'), '--wui-glass-corner-radius')).toBe('calc(36px / 2)')
    expect(cssVar(inner(buttonGroup, '.wui-button-group-inner'), '--wui-glass-corner-radius')).toBe('calc(36px / 2)')
    expect(cssVar(inner(slider, '.wui-slider-thumb'), '--wui-glass-corner-radius')).toBe('calc(min(30px, 20px) / 2)')
    expect(cssVar(inner(avatar, '.avatar-inner'), '--wui-glass-corner-radius')).toBe('calc(48px / 2)')
    expect(cssVar(inner(squareAvatar, '.avatar-inner'), '--wui-glass-corner-radius')).toBe('12px')
    expect(cssVar(switchThumb, '--wui-glass-corner-radius')).toBe('calc(16px / 2)')
  })

  it('textarea 使用 menu radius，且 glass corner 与之联动', async () => {
    const theme = createTheme()
    const textarea = document.createElement('web-ui-textarea')
    theme.append(textarea)
    await textarea.updateComplete

    const box = inner(textarea, '.wui-textarea-inner')
    expect(radius(box)).toBe('18px')
    expect(cssVar(box, '--wui-glass-corner-radius')).toBe('18px')

    theme.style.setProperty('--wui-radius-menu', '12px')
    expect(radius(box)).toBe('12px')
    expect(cssVar(box, '--wui-glass-corner-radius')).toBe('12px')
  })

  it('toast 使用 menu radius，且 glass corner 与之联动', async () => {
    const theme = createTheme()
    const toast = document.createElement('web-ui-toast') as WebUiToast
    theme.append(toast)
    await toast.updateComplete

    const panel = inner(toast, '.toast')
    expect(radius(panel)).toBe('18px')
    expect(cssVar(panel, '--wui-glass-corner-radius')).toBe('18px')

    theme.style.setProperty('--wui-radius-menu', '12px')
    expect(radius(panel)).toBe('12px')
    expect(cssVar(panel, '--wui-glass-corner-radius')).toBe('12px')
  })

  it('dialog 使用 overlay radius 并驱动 glass corner', async () => {
    const theme = createTheme()
    const dialog = document.createElement('web-ui-dialog') as WebUiDialog
    dialog.textContent = 'content'
    theme.append(dialog)
    dialog.open = true
    await dialog.updateComplete
    await nextFrame()

    const body = inner(dialog, '.wui-dialog-body')
    expect(radius(body)).toBe('28px')
    expect(cssVar(body, '--wui-glass-corner-radius')).toBe('28px')

    theme.style.setProperty('--wui-radius-overlay', '20px')
    expect(radius(body)).toBe('20px')
    expect(cssVar(body, '--wui-glass-corner-radius')).toBe('20px')
  })

  it('drawer 默认 overlay radius，--wui-drawer-radius 仍可独立覆盖', async () => {
    await page.viewport(1280, 720)
    const theme = createTheme()
    const drawer = document.createElement('web-ui-drawer') as WebUiDrawer
    drawer.textContent = 'content'
    theme.append(drawer)
    drawer.open = true
    await drawer.updateComplete
    await nextFrame()

    const dialogEl = inner(drawer, 'dialog')
    expect(radius(dialogEl)).toBe('28px')

    theme.style.setProperty('--wui-drawer-radius', '10px')
    expect(radius(dialogEl)).toBe('10px')
    expect(cssVar(inner(drawer, '.wui-drawer-body'), '--wui-glass-corner-radius')).toBe('10px')
  })

  it('desktop/mobile sidebar 的 radius 驱动 glass corner，--wui-layout-sidebar-radius 仍可独立覆盖', async () => {
    await page.viewport(1280, 720)
    const theme = createTheme()
    const layout = document.createElement('web-ui-layout') as WebUiLayout
    layout.innerHTML = `
      <header slot="header">Header</header>
      <div slot="sidebar" style="height: 100%">Sidebar</div>
      <main>Content</main>
    `
    theme.append(layout)
    await layout.updateComplete
    await nextFrame()

    let panel = await waitForLayoutShell(layout, 'desktop')
    expect(radius(panel)).toBe('28px')
    expect(cssVar(panel, '--wui-glass-corner-radius')).toBe('28px')

    await page.viewport(390, 844)
    await layout.updateComplete
    await nextFrame()
    let mobilePanel = await waitForLayoutShell(layout, 'mobile')
    expect(radius(mobilePanel)).toBe('28px')
    expect(cssVar(mobilePanel, '--wui-glass-corner-radius')).toBe('28px')

    await page.viewport(1280, 720)
    panel = await waitForLayoutShell(layout, 'desktop')

    theme.style.setProperty('--wui-radius-overlay', '20px')
    expect(radius(panel)).toBe('20px')
    expect(cssVar(panel, '--wui-glass-corner-radius')).toBe('20px')

    await page.viewport(390, 844)
    await layout.updateComplete
    await nextFrame()
    mobilePanel = await waitForLayoutShell(layout, 'mobile')
    expect(radius(mobilePanel)).toBe('20px')
    expect(cssVar(mobilePanel, '--wui-glass-corner-radius')).toBe('20px')

    await page.viewport(1280, 720)
    panel = await waitForLayoutShell(layout, 'desktop')

    theme.style.setProperty('--wui-layout-sidebar-radius', '12px')
    expect(radius(panel)).toBe('12px')
    expect(cssVar(panel, '--wui-glass-corner-radius')).toBe('12px')

    await page.viewport(390, 844)
    await layout.updateComplete
    await nextFrame()
    mobilePanel = await waitForLayoutShell(layout, 'mobile')
    expect(radius(mobilePanel)).toBe('12px')
    expect(cssVar(mobilePanel, '--wui-glass-corner-radius')).toBe('12px')
  })

  it('checkbox / avatar square / empty icon 使用组件内部 radius，不随语义 token 变化', async () => {
    const theme = createTheme({ '--wui-radius-control': '2px', '--wui-radius-menu': '2px' })
    const checkbox = document.createElement('web-ui-checkbox')
    const avatar = document.createElement('web-ui-avatar')
    avatar.setAttribute('shape', 'square')
    const empty = document.createElement('web-ui-empty')
    theme.append(checkbox, avatar, empty)
    await Promise.all([checkbox.updateComplete, avatar.updateComplete, empty.updateComplete])

    expect(radius(inner(checkbox, '.wui-checkbox-box'))).toBe('6px')
    expect(radius(inner(avatar, '.avatar-inner'))).toBe('12px')
    expect(radius(inner(empty, '.empty-icon'))).toBe('16px')
  })
})
