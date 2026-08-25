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
})
