import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { cleanupElement, flushSlotChange, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

function createDialog(initialHTML = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

/**
 * 关闭 button 按「有可访问名」定位，不按内部 class。
 *
 * 刻意**不**钉住名字的字面量（`aria-label="Close"`）：可访问名必须存在是 AT 契约，
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

describe('WebUiDialog closable', () => {
  it('默认不渲染关闭 button', async () => {
    const el = createDialog('<span slot="header">标题</span>')
    await waitForUpdate(el)

    expect(el.closable).toBe(false)
    expect(closeButton(el)).toBeNull()
    cleanupElement(el)
  })

  it('closable 渲染带可访问名的关闭 button', async () => {
    const el = createDialog('<span slot="header">标题</span>')
    el.closable = true
    await waitForUpdate(el)

    // closeButton 只认「非空 aria-label 的元素」，所以这条 truthy 已经把可访问名那半
    // 一起判掉了；它是不是真的可按由下面两条点击用例负责，这里不钉标签名。
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

  it('点击关闭 button 走用户关闭路径', async () => {
    const el = createDialog()
    el.closable = true
    el.open = true
    await waitForUpdate(el)

    closeButton(el)?.click()
    await waitForUpdate(el)

    expect(el.open).toBe(false)
    cleanupElement(el)
  })

  it('controlled 下点击关闭 button 只派发请求，不自行关闭', async () => {
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

  it('开启期间切换 closable 可增删 button', async () => {
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
 * headless 模式的契约：Consumer 的内容只渲染一次，内置标题带不参与。
 * toggle 是 `headless` 布尔属性（reflect），与 `<web-ui-drawer>` 同形。
 * 判据走用户可观察面（内容在场次数、可访问名接线），不钉内部容器类名。
 */
describe('WebUiDialog headless', () => {
  function nativeDialog(el: WebUiDialog): HTMLDialogElement {
    return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
  }

  const defaultSlotCount = (el: WebUiDialog) => el.shadowRoot!.querySelectorAll('slot:not([name])').length

  /** Consumer 的内容是否真的被分发进默认槽（分发后的落点，不是内部容器类名）。 */
  function distributedContent(el: WebUiDialog): Element | null {
    const slot = el.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement | null
    return slot?.assignedElements().find(node => node.id === 'body') ?? null
  }

  it('headless 只渲染 Consumer 内容，不接管可访问名', async () => {
    const el = createDialog('<section id="body">自定义主体</section>')
    el.heading = '不该出现的标题'
    el.headless = true
    await flushSlotChange(el)

    expect(el.headless).toBe(true)
    // CSS 的 :host([headless]) scoping 依赖 attribute，所以这个属性必须 reflect。
    expect(el.hasAttribute('headless')).toBe(true)
    expect(distributedContent(el), 'headless 下 Consumer 内容应被分发进默认槽').toBeTruthy()
    expect(defaultSlotCount(el)).toBe(1)
    // 内置标题带没有参与命名：headless 下名字留给 Consumer。
    expect(nativeDialog(el).hasAttribute('aria-labelledby')).toBe(false)
    cleanupElement(el)
  })

  it('headless 关掉后内置标题重新接管命名，内容仍只渲染一次', async () => {
    const el = createDialog('<section id="body">自定义主体</section>')
    el.heading = '设置'
    el.headless = true
    await flushSlotChange(el)

    el.headless = false
    await flushSlotChange(el)

    expect(el.hasAttribute('headless')).toBe(false)
    expect(distributedContent(el), '退出 headless 后 Consumer 内容应仍在默认槽里').toBeTruthy()
    expect(defaultSlotCount(el)).toBe(1)
    expect(nativeDialog(el).getAttribute('aria-labelledby')).toBe('wui-dialog-heading')
    cleanupElement(el)
  })

  it('切换 headless 不会让内容同时渲染两次', async () => {
    const el = createDialog('<section id="body">自定义主体</section>')
    await flushSlotChange(el)
    expect(defaultSlotCount(el)).toBe(1)

    el.headless = true
    await flushSlotChange(el)
    expect(defaultSlotCount(el)).toBe(1)

    el.headless = false
    await flushSlotChange(el)
    expect(defaultSlotCount(el)).toBe(1)
    cleanupElement(el)
  })

  /*
   * headless 不渲染内置 chrome 带：header / footer 槽一概不存在，heading 也一并失效。
   *
   * 判据落在公开的组合面上——槽是调用方写内容的入口，槽不在场就意味着消费者的 header /
   * footer 内容不参与渲染；heading 的文字则不出现在组件里任何一个地方。
   */
  it('headless 不渲染内置 chrome 带：header / footer 槽与 heading 都不在场', async () => {
    const el = createDialog('<span slot="header">槽标题</span><section id="body">自定义主体</section>')
    el.heading = '属性标题'
    el.headless = true
    await flushSlotChange(el)

    expect(el.shadowRoot?.querySelector('slot[name="header"]')).toBeNull()
    expect(el.shadowRoot?.querySelector('slot[name="footer"]')).toBeNull()
    expect(el.shadowRoot?.textContent).not.toContain('属性标题')
    cleanupElement(el)
  })
})
