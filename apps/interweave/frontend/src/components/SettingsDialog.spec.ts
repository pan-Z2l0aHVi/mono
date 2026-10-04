// @vitest-environment jsdom

import { local } from '@greypan/browser-kit'
import '@greypan/web-ui'
import type { WebUiDialog, WebUiRadio, WebUiRadioGroup, WebUiSegmented } from '@greypan/web-ui'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { useSettingsStore } from '@/stores/settings'

import SettingsDialog from './SettingsDialog.vue'

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
 * 关闭**行为**由后面两条覆盖——受控的 Escape/遮罩路径，以及 shadow 内按钮点击派发的
 * `open-change`（组件把两条用户关闭入口收在 `_closeFromUser` 一处，controlled 下都只派发
 * 关闭请求，宿主因此仍拿到同一条 `update:open(false)`）。按钮本身点不点得动归 web-ui 自己测。
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

  it('标题栏关闭交给组件的 closable，宿主不另画一套关闭入口', async () => {
    const mounted = mountDialog(() => {})

    try {
      await nextTick()

      expect(mounted.host.querySelector('[slot="title"]')?.textContent).toContain('设置')
      expect(dialogElement(mounted.host).closable).toBe(true)
      // 宿主不再自绘标题栏关闭按钮，也没有 footer「关闭」——标题行那一枚由 web-ui-dialog
      // 自己渲染（在其 shadow 内），宿主拿不到那个节点。
      expect(() => buttonByLabel(mounted.host, '关闭设置')).toThrow('button 关闭设置 was not rendered')
      expect(mounted.host.querySelector('[slot="footer"]')).toBeNull()
    } finally {
      mounted.close()
    }
  })

  it('默认落在通用分区，MCP 开关是 disabled 的占位', async () => {
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
      // disabled 的开关不该带着 checked 一起出现，那会读成「已开启但不可用」。
      expect(toggle?.checked).toBe(false)
    } finally {
      mounted.close()
    }
  })

  it('外观页渲染主题三态 segmented 与 6 个 accent 色板', async () => {
    const mounted = mountDialog(() => {})

    try {
      await nextTick()
      selectTrigger(segmentedByLabel(mounted.host, '设置分区'), 'appearance')
      await nextTick()

      expect(mounted.host.querySelector('web-ui-segmented[aria-label="主题模式"]')).toBeTruthy()
      expect(mounted.host.querySelectorAll('web-ui-radio')).toHaveLength(6)
      expect([...mounted.host.querySelectorAll<WebUiRadio>('web-ui-radio')].map(radio => radio.value)).toEqual([
        '#0a84ff',
        '#1d8348',
        '#c64600',
        '#ff453a',
        '#bf5af2',
        '#ff375f'
      ])
    } finally {
      mounted.close()
    }
  })

  /*
   * 回归：accent 的可点区域必须是原生按钮，不能是 web-ui-radio 的 host。
   *
   * web-ui-radio 的可点区域在 shadow 里那个 <label> 上，而 :host 自身没有尺寸规则——它是个
   * 0×0 的盒子。色板这格又是 flex-wrap 的 <span> 布局，host 中心那一片点下去落在组件之外，
   * group 的 change 根本不派发：浏览器实测点 host 中心时 group.value 纹丝不动，而直接点
   * shadow 里的 label 才会切。jsdom 里点 host 无效、点 label 有效，组件自身的测试覆盖不到
   * 「从 light DOM 投影 slot 后 host 中心是否可点」这一层，所以这条断言必须在。
   *
   * 钉的是「六个色板各自有一个带可访问名与 role 的原生按钮」——也就是用户与辅助技术
   * 实际命中的目标；radio 本身是不是 pointer-events-none 属于内部实现，另有下面两条
   * 直接断言「点按钮 → store 写入」的用例守着因果链。
   */
  it('accent 色板的可点区域是原生按钮，不是 web-ui-radio 的 host', async () => {
    const mounted = mountDialog(() => {})

    try {
      await nextTick()
      selectTrigger(segmentedByLabel(mounted.host, '设置分区'), 'appearance')
      await nextTick()

      const buttons = [...mounted.host.querySelectorAll<HTMLButtonElement>('button[role="radio"]')]
      expect(buttons).toHaveLength(6)
      expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual([
        '强调色 蓝',
        '强调色 绿',
        '强调色 橙',
        '强调色 红',
        '强调色 紫',
        '强调色 粉'
      ])
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

  it('点 accent 色板按钮经合成 click 写入 store，认不出的值不落库', async () => {
    const mounted = mountDialog(() => {})
    const settings = useSettingsStore()

    try {
      await nextTick()
      selectTrigger(segmentedByLabel(mounted.host, '设置分区'), 'appearance')
      await nextTick()
      expect(settings.accent).toBe('#0a84ff')

      const green = mounted.host.querySelector<HTMLButtonElement>('button[aria-label="强调色 绿"]')
      if (!green) throw new Error('accent 绿按钮未渲染')
      green.click()
      await nextTick()

      expect(settings.accent).toBe('#1d8348')
      expect(local.get('theme-accent')).toBe('#1d8348')
      // 选中态只有一个真相：accent 同时驱动按钮的 aria-checked 与 web-ui-radio 的 checked。
      const radios = [...mounted.host.querySelectorAll<WebUiRadio>('web-ui-radio')]
      expect(radios.map(radio => radio.checked)).toEqual([false, true, false, false, false, false])
      const buttons = [...mounted.host.querySelectorAll<HTMLButtonElement>('button[role="radio"]')]
      expect(buttons.map(button => button.getAttribute('aria-checked'))).toEqual([
        'false',
        'true',
        'false',
        'false',
        'false',
        'false'
      ])

      settings.setAccent('red')
      expect(settings.accent).toBe('#1d8348')
      expect(local.get('theme-accent')).toBe('#1d8348')
    } finally {
      mounted.close()
    }
  })

  /*
   * 回归：点色板必须经 pickAccent 直接写 store，不能改成「合成一次点击转发进 web-ui-radio、
   * 再听它的 change 回写」。那条路走不通——radio 是 pointer-events-none 的纯显示层，
   * 合成点击进不了 group controller；而一旦把它升回写入层，store 就有了两个写入者。
   *
   * 钉住「点击 → store 写入」这条因果链，而不是组件内部怎么派事件：把转发实现换掉时，
   * 下面这个 spy 仍会绿，但它测不到 store 到底有没有被写，所以另有一条
   * 「点 accent 色板按钮经合成 click 写入 store」同时断言 store 的实际值。
   */
  it('点色板按钮直接写 store，不转发进 web-ui-radio', async () => {
    const setAccent = vi.spyOn(useSettingsStore(), 'setAccent')
    const mounted = mountDialog(() => {})

    try {
      await nextTick()
      selectTrigger(segmentedByLabel(mounted.host, '设置分区'), 'appearance')
      await nextTick()

      const green = mounted.host.querySelector<HTMLButtonElement>('button[aria-label="强调色 绿"]')
      if (!green) throw new Error('accent 绿按钮未渲染')
      green.click()
      await nextTick()

      // 一次点击一次写入，值就是被点的那个色
      expect(setAccent).toHaveBeenCalledTimes(1)
      expect(setAccent).toHaveBeenCalledWith('#1d8348')
    } finally {
      setAccent.mockRestore()
      mounted.close()
    }
  })

  it('controlled 下 Escape 与遮罩点击的关闭请求透传成 update:open，不自行改 open', async () => {
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

  /*
   * 高度契约：`--wui-dialog-max-height` 的语义已从「整卡高度」改成「内容区高度」，
   * 上限改由 web-ui-dialog 内部的 `.desc` 承担，宿主因此不再复述 chrome 常数。
   *
   * 只断言「内层引用 token 而非写死像素」这一层：jsdom 没有布局引擎，具体高度由浏览器
   * 验证与 packages/web-ui 的 dialog-content-height.browser.spec.ts 覆盖。
   */
  it('内容区高度走 --wui-dialog-max-height token，内层不再复述 chrome 常数', async () => {
    const mounted = mountDialog(() => {})

    try {
      await nextTick()

      const inner = [...mounted.host.querySelectorAll<HTMLElement>('[style]')].find(el =>
        el.style.height.includes('--wui-dialog-max-height')
      )
      if (!inner) throw new Error('settings body was not rendered')
      expect(inner.style.height).toBe('var(--wui-dialog-max-height)')
      // 回归护栏：内层不得再出现 chrome 常数（token 里那一次是新语义下的换算）。
      expect(inner.style.height).not.toMatch(/\d+px/)
    } finally {
      mounted.close()
    }
  })
})
