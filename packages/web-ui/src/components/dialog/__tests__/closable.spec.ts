import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

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
    const el = createDialog('<span slot="title">标题</span>')
    await waitForUpdate(el)

    expect(el.closable).toBe(false)
    expect(closeButton(el)).toBeNull()
    cleanupElement(el)
  })

  it('closable 渲染带可访问名的关闭按钮', async () => {
    const el = createDialog('<span slot="title">标题</span>')
    el.closable = true
    await waitForUpdate(el)

    expect(closeButton(el)).toBeTruthy()
    cleanupElement(el)
  })

  it('body 模式下同样受 closable 控制', async () => {
    const closed = createDialog('<section slot="body">自定义主体</section>')
    await waitForUpdate(closed)
    expect(closeButton(closed)).toBeNull()
    cleanupElement(closed)

    const open = createDialog('<section slot="body">自定义主体</section>')
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
 * body slot 的存在性契约：body slot 有内容 → 默认的 title/desc/footer 三段不投影
 * （消费者接管整个主体）；body slot 空 → 回到默认三段。
 *
 * 观察面用「哪些 slot 实际投影出了元素」而不是「shadow 里有没有某个 slot 元素」：
 * 模板里那个 hidden 的 body slot 恒在，用户看不见它的存在。
 */
function projectedSlots(el: WebUiDialog): string[] {
  return ['title', 'body', 'footer']
    .map(name => {
      const slot = queryA11y(el, `slot[name="${name}"]`) as HTMLSlotElement | null
      return (slot?.assignedElements().length ?? 0) > 0 ? name : ''
    })
    .filter(Boolean)
}

describe('WebUiDialog body slot presence', () => {
  it('body 后续插入时切换到自定义主体模式', async () => {
    const el = createDialog('<p id="description">Default description</p>')
    await waitForUpdate(el)
    expect(projectedSlots(el)).toEqual([])

    el.insertAdjacentHTML('afterbegin', '<section id="body" slot="body">Custom body</section>')
    await waitForUpdate(el)

    expect(projectedSlots(el)).toEqual(['body'])
    cleanupElement(el)
  })

  it('body 移除后恢复默认主体组合', async () => {
    const el = createDialog('<section id="body" slot="body">Custom body</section>')
    await waitForUpdate(el)
    expect(projectedSlots(el)).toEqual(['body'])

    el.querySelector('#body')!.remove()
    await waitForUpdate(el)

    expect(projectedSlots(el)).toEqual([])
    cleanupElement(el)
  })

  it('插入后替换 body 条件包装内容仍分配新主体', async () => {
    const el = createDialog('<section id="first" slot="body">First</section>')
    await waitForUpdate(el)

    const first = el.querySelector('#first')!
    const second = document.createElement('section')
    second.id = 'second'
    second.setAttribute('slot', 'body')
    second.textContent = 'Second'
    first.replaceWith(second)
    await waitForUpdate(el)

    const slot = queryA11y(el, 'slot[name="body"]') as HTMLSlotElement
    expect(slot.assignedElements()[0]?.id).toBe('second')
    cleanupElement(el)
  })

  it('断开期间替换 body，重连后仍使用自定义主体模式', async () => {
    const el = createDialog('<section id="first" slot="body">First</section>')
    await waitForUpdate(el)

    el.remove()
    el.querySelector('#first')!.setAttribute('id', 'second')
    el.querySelector('#second')!.textContent = 'Second'

    document.body.append(el)
    await flush()

    expect(projectedSlots(el)).toEqual(['body'])
    cleanupElement(el)
  })
})
