import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

function createDialog(initialHTML = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

/**
 * 关闭按钮按「有可访问名」定位，不按内部 class。
 *
 * 刻意**不**钉住名字的字面量（`aria-label="关闭"`）：可访问名必须存在是 AT 契约，
 * 具体叫什么属于本地化内容——dialog/index.ts 目前硬编码中文，改成别的语言不该
 * 让这批测试集体变红。
 */
function closeButton(el: WebUiDialog): HTMLElement | null {
  return (
    [...el.shadowRoot!.querySelectorAll<HTMLElement>('[aria-label]')].find(
      button => button.getAttribute('aria-label')?.trim() !== ''
    ) ?? null
  )
}

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('WebUiDialog closable', () => {
  it('默认不渲染关闭按钮', async () => {
    const el = createDialog('<span slot="header">标题</span>')
    await waitForUpdate(el)

    expect(el.closable).toBe(false)
    expect(closeButton(el)).toBeNull()
    cleanupElement(el)
  })

  it('closable 渲染带可访问名的关闭按钮', async () => {
    const el = createDialog('<span slot="header">标题</span>')
    el.closable = true
    await waitForUpdate(el)

    expect(closeButton(el)).toBeTruthy()
    cleanupElement(el)
  })

  it('headless 模式下同样受 closable 控制', async () => {
    const closed = createDialog('<section>自定义主体</section>')
    closed.headless = true
    await waitForUpdate(closed)
    expect(closeButton(closed)).toBeNull()
    cleanupElement(closed)

    const open = createDialog('<section>自定义主体</section>')
    open.headless = true
    open.closable = true
    await waitForUpdate(open)
    expect(closeButton(open)).toBeTruthy()
    cleanupElement(open)
  })

  it('点击关闭按钮走用户关闭路径', async () => {
    const el = createDialog()
    el.closable = true
    el.open = true
    await waitForUpdate(el)

    closeButton(el)?.click()
    await waitForUpdate(el)

    expect(el.open).toBe(false)
    cleanupElement(el)
  })

  it('controlled 下点击关闭按钮只派发请求，不自行关闭', async () => {
    const el = createDialog()
    el.closable = true
    el.controlled = true
    el.open = true
    await waitForUpdate(el)
    const [events] = spyEvents<CustomEvent<{ open: boolean }>>(el, 'open-change')

    closeButton(el)?.click()
    await waitForUpdate(el)

    expect(events).toHaveLength(1)
    expect(events[0]?.detail).toEqual({ open: false })
    expect(el.open).toBe(true)
    cleanupElement(el)
  })

  it('开启期间切换 closable 可增删按钮', async () => {
    const el = createDialog()
    el.open = true
    await waitForUpdate(el)
    expect(closeButton(el)).toBeNull()

    el.closable = true
    await waitForUpdate(el)
    expect(closeButton(el)).toBeTruthy()

    el.closable = false
    await waitForUpdate(el)
    expect(closeButton(el)).toBeNull()
    cleanupElement(el)
  })
})

/*
 * headless 模式的契约：默认槽的内容渲染进卡片内的滚动层 `.wui-dialog-content`，内置的
 * header / .desc / footer 三段一律不渲染。开关是 `headless` 布尔属性（reflect），与
 * `<web-ui-drawer>` 同形——不再是「往某个具名 slot 里塞元素」。
 */
function shadowQuery<T extends Element>(el: WebUiDialog, selector: string): T | null {
  return el.shadowRoot?.querySelector<T>(selector) ?? null
}

describe('WebUiDialog headless', () => {
  it('headless 让默认槽渲染进 .wui-dialog-content，且 header / .desc / footer 都不渲染', async () => {
    const el = createDialog('<section id="body">自定义主体</section>')
    el.headless = true
    await flush()
    await waitForUpdate(el)

    expect(el.headless).toBe(true)
    // CSS 的 :host([headless]) scoping 依赖 attribute，所以这个属性必须 reflect。
    expect(el.hasAttribute('headless')).toBe(true)

    expect(shadowQuery(el, '.wui-dialog-content'), '默认槽应落在这个滚动层里').toBeTruthy()
    expect(shadowQuery(el, '.header'), 'headless 不渲染 chrome 带').toBeNull()
    expect(shadowQuery(el, '.desc'), 'headless 不渲染 .desc').toBeNull()
    expect(shadowQuery(el, '.wui-dialog-footer'), 'headless 不渲染 footer').toBeNull()

    const slot = shadowQuery<HTMLSlotElement>(el, '.wui-dialog-content slot')
    expect(slot?.assignedElements()[0]?.id).toBe('body')
    cleanupElement(el)
  })

  it('headless 关掉后默认槽回到 .desc，chrome 带重新渲染', async () => {
    const el = createDialog('<section id="body">自定义主体</section>')
    el.headless = true
    await flush()
    await waitForUpdate(el)

    el.headless = false
    await flush()
    await waitForUpdate(el)

    expect(el.hasAttribute('headless')).toBe(false)
    expect(shadowQuery(el, '.wui-dialog-content')).toBeNull()
    expect(shadowQuery(el, '.desc')).toBeTruthy()
    expect(shadowQuery(el, '.header')).toBeTruthy()

    const slot = shadowQuery<HTMLSlotElement>(el, '.desc slot')
    expect(slot?.assignedElements()[0]?.id).toBe('body')
    cleanupElement(el)
  })

  it('默认槽同一时刻只渲染一次（.desc 与 .wui-dialog-content 二选一）', async () => {
    const el = createDialog('<section id="body">自定义主体</section>')
    await waitForUpdate(el)
    const defaultSlotCount = () => el.shadowRoot!.querySelectorAll('slot:not([name])').length

    expect(defaultSlotCount()).toBe(1)

    el.headless = true
    await flush()
    await waitForUpdate(el)
    expect(defaultSlotCount()).toBe(1)

    el.headless = false
    await flush()
    await waitForUpdate(el)
    expect(defaultSlotCount()).toBe(1)
    cleanupElement(el)
  })
})
