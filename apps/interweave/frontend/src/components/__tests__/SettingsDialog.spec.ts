// @vitest-environment jsdom

import '@greypan/web-ui'

import { local } from '@greypan/browser-kit'
import type { WebUiDialog, WebUiRadio, WebUiRadioGroup, WebUiSegmented, WebUiSwitch } from '@greypan/web-ui'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick, ref } from 'vue'

import { useSettingsStore } from '@/stores/settings'

import SettingsDialog from '../SettingsDialog.vue'

function mountDialog(onUpdateOpen: (value: boolean) => void) {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    render: () => h(SettingsDialog, { open: true, 'onUpdate:open': onUpdateOpen })
  })
  app.mount(host)
  return {
    host,
    close: () => {
      app.unmount()
      host.remove()
    }
  }
}

function dialogElement(host: HTMLElement) {
  const element = host.querySelector('web-ui-dialog')
  if (!element) throw new Error('web-ui-dialog was not rendered')
  return element as WebUiDialog
}

function buttonByLabel(host: HTMLElement, label: string) {
  const button = host.querySelector<HTMLElement>(`web-ui-button[aria-label="${label}"]`)
  if (!button) throw new Error(`button ${label} was not rendered`)
  return button
}

/*
 * 关闭**接线**由后面两条覆盖——合成的受控关闭请求，以及 shadow 内 button 点击派发的
 * `open-change`（组件把两条用户关闭入口收在 `_closeFromUser` 一处，controlled 下都只派发
 * 关闭请求，宿主因此仍拿到同一条 `update:open(false)`）。button 本身点不点得动归 web-ui 自己测。
 */
function segmentedByLabel(host: HTMLElement, label: string) {
  const element = host.querySelector<WebUiSegmented>(`web-ui-segmented[aria-label="${label}"]`)
  if (!element) throw new Error(`segmented ${label} was not rendered`)
  return element
}

/*
 * value 走 property 而非 attribute：web-ui-segmented-trigger 的 value 没有 reflect，
 * 属性不会回写进 DOM，getAttribute 只会读到 null。测试和宿主读的是同一个 property。
 */
function triggerValues(segmented: WebUiSegmented) {
  return [...segmented.querySelectorAll<WebUiRadio>('web-ui-segmented-trigger')].map(trigger => trigger.value)
}

/**
 * 模拟用户点中某个 trigger。
 *
 * 真实路径是 trigger 的 click 冒泡到 segmented，由 group controller 先写 value、再派一次
 * change（segmented/index.ts 的 setItemSelected → dispatchValueChange）。宿主依赖的正是这个
 * 顺序：change 到达时 currentTarget.value 已经是新值。jsdom 里 click 不会走 controller，
 * 所以这里照组件契约把两段都做出来——组件自身的 jsdom 行为由 web-ui 自己的测试负责，
 * 这里要守的是宿主那一半：「change 到达后把新值回写」。
 */
function selectTrigger(segmented: WebUiSegmented, value: string) {
  const trigger = [...segmented.querySelectorAll<WebUiRadio>('web-ui-segmented-trigger')].find(
    item => item.value === value
  )
  if (!trigger) throw new Error(`trigger ${value} was not rendered`)
  trigger.click()
  segmented.value = value
  segmented.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
}

describe('SettingsDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('重新打开设置时回到常规分区', async () => {
    const open = ref(true)
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({ render: () => h(SettingsDialog, { open: open.value }) })
    app.mount(host)
    try {
      await nextTick()
      selectTrigger(segmentedByLabel(host, '设置分区'), 'appearance')
      await nextTick()
      expect(segmentedByLabel(host, '设置分区').value).toBe('appearance')
      open.value = false
      await nextTick()
      open.value = true
      await nextTick()
      expect(segmentedByLabel(host, '设置分区').value).toBe('general')
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('header 关闭交给组件的 closable，宿主不另画一套关闭入口', async () => {
    const mounted = mountDialog(() => {})

    try {
      await nextTick()

      expect(dialogElement(mounted.host).getAttribute('aria-dialog-label')).toBe('设置')
      expect(mounted.host.querySelector('h2')?.textContent).toBe('设置')
      expect(dialogElement(mounted.host).closable).toBe(true)
      // 宿主不自绘 header 关闭 button，也没有 footer「关闭」——标题行那一枚由 web-ui-dialog
      // 自己渲染（在其 shadow 内），宿主拿不到那个节点。
      expect(() => buttonByLabel(mounted.host, '关闭设置')).toThrow('button 关闭设置 was not rendered')
      expect(mounted.host.querySelector('[slot="footer"]')).toBeNull()
    } finally {
      mounted.close()
    }
  })

  /*
   * 结构守卫：「设置分区」必须挂在 dialog 的固定 chrome（title slot）里，内容区不套
   * 应用自己的滚动宿主。按住时胶囊会横向越出 track 9px，任何 overflow 非 visible 的祖先
   * 都会在 padding box 上把它切平——把 tab 行放回滚动区就是把这个缺陷请回来。
   */
  it('设置分区挂在标题 chrome，内容区不再套滚动宿主', async () => {
    const mounted = mountDialog(() => {})

    try {
      await nextTick()
      const dialog = dialogElement(mounted.host)
      const titleChrome = mounted.host.querySelector('[slot="header"]')
      const segmented = segmentedByLabel(mounted.host, '设置分区')

      expect(titleChrome, 'title slot 应渲染标题 chrome').toBeTruthy()
      expect(titleChrome?.contains(segmented), '设置分区应落在 title chrome 内').toBe(true)

      // 内容区（默认 slot）里只剩 panel：没有 OverlayScrollbars / overflow-y-auto 宿主。
      const panel = dialog.querySelector(':scope > div:not([slot])')
      expect(panel, 'panel 应是 dialog 的直系子节点').toBeTruthy()
      expect(panel?.contains(segmented), 'panel 不应再包住 tab 行').toBe(false)
      expect(dialog.querySelector('.overflow-y-auto'), '内容区不应再有应用自套的滚动宿主').toBeNull()
      expect(dialog.querySelector('[data-overlayscrollbars-viewport]'), '内容区不应再有 OS 视口').toBeNull()
    } finally {
      mounted.close()
    }
  })

  it('默认落在通用分区，MCP switch 是 disabled 的占位', async () => {
    const mounted = mountDialog(() => {})

    try {
      await nextTick()

      const general = segmentedByLabel(mounted.host, '设置分区')
      expect(general.value).toBe('general')
      expect(triggerValues(general)).toEqual(['general', 'appearance', 'library'])

      const toggle = mounted.host.querySelector('web-ui-switch')
      expect(toggle).toBeTruthy()
      expect(toggle?.disabled).toBe(true)
      expect(mounted.host.textContent).toContain('即将推出')
      // disabled 的 switch 不该带着 checked 一起出现，那会读成「已开启但不可用」。
      expect(toggle?.checked).toBe(false)
    } finally {
      mounted.close()
    }
  })

  it('外观页提供八种可访问的强调色', async () => {
    const mounted = mountDialog(() => {})
    try {
      await nextTick()
      selectTrigger(segmentedByLabel(mounted.host, '设置分区'), 'appearance')
      await nextTick()
      const radios = [...mounted.host.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
      expect(radios.map(radio => radio.getAttribute('aria-label'))).toEqual([
        '强调色 蓝',
        '强调色 紫',
        '强调色 粉',
        '强调色 红',
        '强调色 橙',
        '强调色 黄',
        '强调色 绿',
        '强调色 灰'
      ])
    } finally {
      mounted.close()
    }
  })

  it('减少动画开关保存偏好并在重新创建 store 后恢复', async () => {
    const mounted = mountDialog(() => {})
    try {
      await nextTick()
      selectTrigger(segmentedByLabel(mounted.host, '设置分区'), 'appearance')
      await nextTick()
      const toggle = mounted.host.querySelector<WebUiSwitch>('web-ui-switch[aria-label="减少动画效果"]')
      if (!toggle) throw new Error('减少动画开关未渲染')
      expect(toggle.checked).toBe(false)
      toggle.checked = true
      toggle.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      expect(useSettingsStore().reducedMotion).toBe(true)
      expect(local.get('theme-reduced-motion')).toBe(true)
      setActivePinia(createPinia())
      expect(useSettingsStore().reducedMotion).toBe(true)
    } finally {
      mounted.close()
    }
  })

  it('主题三态经 change 回写到 store 与组件 value', async () => {
    const mounted = mountDialog(() => {})
    const settings = useSettingsStore()

    try {
      await nextTick()
      selectTrigger(segmentedByLabel(mounted.host, '设置分区'), 'appearance')
      await nextTick()

      const theme = segmentedByLabel(mounted.host, '主题模式')
      expect(theme.value).toBe('system')
      expect(triggerValues(theme)).toEqual(['light', 'dark', 'system'])

      selectTrigger(theme, 'dark')
      await nextTick()

      expect(settings.appearance).toBe('dark')
      expect(segmentedByLabel(mounted.host, '主题模式').value).toBe('dark')
      // dialog 不持有主题：主题真相在 store，宿主 App.vue 才是把它接到 web-ui-theme 上的那一环。
      // 读回走 local.get 而不是比对 localStorage 原始串：落盘带一层 browser-kit 自己的信封，
      // 那层编码是它的实现细节，测试钉它等于把实现当契约。
      expect(local.get('theme-appearance')).toBe('dark')
    } finally {
      mounted.close()
    }
  })

  it('选择强调色后更新设置并持久化', async () => {
    const mounted = mountDialog(() => {})
    const settings = useSettingsStore()
    try {
      await nextTick()
      selectTrigger(segmentedByLabel(mounted.host, '设置分区'), 'appearance')
      await nextTick()
      const green = mounted.host.querySelector<HTMLInputElement>('input[aria-label="强调色 绿"]')
      if (!green) throw new Error('强调色 绿未渲染')
      green.click()
      await nextTick()
      expect(settings.accent).toBe('#61bf45')
      expect(local.get('theme-accent')).toBe('#61bf45')
      expect(green.checked).toBe(true)
      settings.setAccent('red')
      expect(settings.accent).toBe('#61bf45')
    } finally {
      mounted.close()
    }
  })

  it('controlled 下收到关闭请求后透传成 update:open，不自行改 open', async () => {
    const onUpdateOpen = vi.fn<(value: boolean) => void>()
    const mounted = mountDialog(onUpdateOpen)

    try {
      await nextTick()
      const dialog = dialogElement(mounted.host)

      dialog.dispatchEvent(new CustomEvent('open-change', { detail: { open: false } }))
      await nextTick()

      expect(onUpdateOpen).toHaveBeenCalledWith(false)
      expect(dialog.open).toBe(true)
    } finally {
      mounted.close()
    }
  })

  // 高度契约（--wui-dialog-max-height 语义）不在 jsdom 里钉 CSS 值：具体高度由浏览器
  // 验证与 packages/web-ui 的 dialog-content-height.browser.spec.ts 覆盖（test-authoring §4）。
})
