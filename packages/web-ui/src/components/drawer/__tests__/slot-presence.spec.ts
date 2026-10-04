import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDrawer } from '..'

afterEach(() => document.body.replaceChildren())

function createDrawer(initialHTML = ''): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

function getSlot(el: WebUiDrawer, name: 'header' | 'footer'): HTMLSlotElement | null {
  return queryA11y(el, `slot[name="${name}"]`) as HTMLSlotElement | null
}

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('WebUiDrawer named-slot presence（jsdom）', () => {
  it('后续插入 header 时渲染并显示 header 区域', async () => {
    const el = createDrawer()
    await waitForUpdate(el)
    const initialHeader = getSlot(el, 'header')
    expect(initialHeader).toBeTruthy()
    expect(initialHeader!.assignedElements()).toHaveLength(0)
    expect(initialHeader!.parentElement?.hasAttribute('hidden')).toBe(true)

    el.insertAdjacentHTML('afterbegin', '<h2 id="title" slot="header">Details</h2>')
    await waitForUpdate(el)

    const slot = getSlot(el, 'header')
    expect(slot).toBeTruthy()
    expect(slot!.assignedElements()).toHaveLength(1)
    expect(slot!.parentElement?.hasAttribute('hidden')).toBe(false)
    cleanupElement(el)
  })

  it('footer 插入、替换和移除时同步分配', async () => {
    const el = createDrawer()
    await waitForUpdate(el)
    expect(getSlot(el, 'footer')?.assignedElements()).toHaveLength(0)
    expect(getSlot(el, 'footer')?.parentElement?.hasAttribute('hidden')).toBe(true)

    el.insertAdjacentHTML('beforeend', '<button id="first" slot="footer">Save</button>')
    await waitForUpdate(el)
    expect(getSlot(el, 'footer')?.assignedElements()).toHaveLength(1)
    expect(getSlot(el, 'footer')?.parentElement?.hasAttribute('hidden')).toBe(false)

    const first = el.querySelector('#first')!
    const second = document.createElement('button')
    second.id = 'second'
    second.setAttribute('slot', 'footer')
    first.replaceWith(second)
    await waitForUpdate(el)
    expect(getSlot(el, 'footer')?.assignedElements()).toHaveLength(1)

    el.querySelector('#second')!.remove()
    await waitForUpdate(el)
    expect(getSlot(el, 'footer')?.assignedElements()).toHaveLength(0)
    cleanupElement(el)
  })

  it('header 和 footer 条件包装在插入后替换仍投影新内容', async () => {
    const el = createDrawer(`
      <h2 id="old-title" slot="header">Old</h2>
      <button id="old-action" slot="footer">Old</button>
    `)
    await waitForUpdate(el)
    expect(getSlot(el, 'header')?.assignedElements()).toHaveLength(1)
    expect(getSlot(el, 'footer')?.assignedElements()).toHaveLength(1)

    const oldTitle = el.querySelector('#old-title')!
    const newTitle = document.createElement('h2')
    newTitle.id = 'new-title'
    newTitle.setAttribute('slot', 'header')
    newTitle.textContent = 'New'
    oldTitle.replaceWith(newTitle)

    const oldAction = el.querySelector('#old-action')!
    const newAction = document.createElement('button')
    newAction.id = 'new-action'
    newAction.setAttribute('slot', 'footer')
    oldAction.replaceWith(newAction)
    await waitForUpdate(el)
    expect(getSlot(el, 'header')?.assignedElements()[0].id).toBe('new-title')
    expect(getSlot(el, 'footer')?.assignedElements()[0].id).toBe('new-action')
    cleanupElement(el)
  })

  it('断开期间替换 footer，重连后分配状态正确', async () => {
    const el = createDrawer('<button id="first" slot="footer">First</button>')
    await waitForUpdate(el)

    el.remove()
    el.querySelector('#first')!.setAttribute('id', 'second')
    el.querySelector('#second')!.textContent = 'Second'

    document.body.append(el)
    await flush()
    expect(getSlot(el, 'footer')?.assignedElements()).toHaveLength(1)
    expect(el.querySelector('#second')?.textContent).toBe('Second')
    cleanupElement(el)
  })

  /*
   * 断连期间清空 slot 内容：重连后该节必须重新隐藏。
   *
   * 缺陷形态（真实浏览器与 jsdom 皆复现）：`connectedCallback` 重算了 `_hasHeaderSlot` /
   * `_hasFooterSlot`，却没排更新。Lit 的 `connectedCallback` 只做 `enableUpdating(true)`
   * 与 `setConnected(true)`，本身不排更新；而 slotchange 只在**分配集合**变化时派发，
   * 断连期间清空的是槽位内容的有无、宿主节点本身没动，于是两条处理器也不触发。
   * `?hidden` 因此停在断连前的取值。
   *
   * 判据只钉用户后果——那一节重新 `hidden`：空节在 style.css 的 padding 下仍有真实高度，
   * 成为一条点不动的死带，拖拽热区的让位量也按它算。
   *
   * assignedElements 只作前置观察、不能单独承重：分配是浏览器直给的，与组件要不要请求更新
   * 无关，只断言它时本缺陷下照样绿。
   */
  it('断开期间清空 footer 内容，重连后 footer 重新隐藏', async () => {
    const el = createDrawer('<button id="save" slot="footer">Save</button>')
    await waitForUpdate(el)
    expect(getSlot(el, 'footer')?.parentElement?.hasAttribute('hidden')).toBe(false)

    el.remove()
    el.querySelector('#save')!.remove()
    document.body.append(el)
    await waitForUpdate(el)

    expect(getSlot(el, 'footer')?.assignedElements()).toHaveLength(0)
    expect(getSlot(el, 'footer')?.parentElement?.hasAttribute('hidden')).toBe(true)
    cleanupElement(el)
  })

  it('断开期间清空 header 内容，重连后 header 重新隐藏', async () => {
    // 不给 heading：`showHeader` 退化成只看 `_hasHeaderSlot`，否则 heading 会把这一节
    // 撑住，重连后的可见与否就分不清是 presence 失效还是本该如此。
    const el = createDrawer('<h2 id="title" slot="header">Details</h2>')
    await waitForUpdate(el)
    expect(getSlot(el, 'header')?.parentElement?.hasAttribute('hidden')).toBe(false)

    el.remove()
    el.querySelector('#title')!.remove()
    document.body.append(el)
    await waitForUpdate(el)

    expect(getSlot(el, 'header')?.assignedElements()).toHaveLength(0)
    expect(getSlot(el, 'header')?.parentElement?.hasAttribute('hidden')).toBe(true)
    cleanupElement(el)
  })
})
