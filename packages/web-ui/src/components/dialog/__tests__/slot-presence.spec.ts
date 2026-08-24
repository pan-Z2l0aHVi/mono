import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

function createDialog(initialHTML = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

function getSlot(el: WebUiDialog, name: 'body' | 'title' | 'footer'): HTMLSlotElement | null {
  return queryA11y(el, `slot[name="${name}"]`) as HTMLSlotElement | null
}

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('WebUiDialog body-slot presence（jsdom）', () => {
  it('body 后续插入时切换到自定义主体模式', async () => {
    const el = createDialog('<p id="description">Default description</p>')
    await waitForUpdate(el)
    expect(getSlot(el, 'title')).toBeTruthy()
    expect(getSlot(el, 'footer')).toBeTruthy()
    expect(getSlot(el, 'body')?.assignedElements()).toHaveLength(0)

    el.insertAdjacentHTML('afterbegin', '<section id="body" slot="body">Custom body</section>')
    await waitForUpdate(el)
    expect(getSlot(el, 'body')?.assignedElements()).toHaveLength(1)
    expect(getSlot(el, 'title')).toBeNull()
    expect(getSlot(el, 'footer')).toBeNull()
    cleanupElement(el)
  })

  it('body 移除后恢复默认主体组合', async () => {
    const el = createDialog('<section id="body" slot="body">Custom body</section>')
    await waitForUpdate(el)
    expect(getSlot(el, 'title')).toBeNull()

    el.querySelector('#body')!.remove()
    await waitForUpdate(el)
    expect(getSlot(el, 'title')).toBeTruthy()
    expect(getSlot(el, 'footer')).toBeTruthy()
    expect(getSlot(el, 'body')?.hasAttribute('hidden')).toBe(true)
    cleanupElement(el)
  })

  it('插入后替换 body 条件包装内容仍分配新主体', async () => {
    const el = createDialog('<section id="first" slot="body">First</section>')
    await waitForUpdate(el)
    expect(getSlot(el, 'body')?.assignedElements()).toHaveLength(1)

    const first = el.querySelector('#first')!
    const second = document.createElement('section')
    second.id = 'second'
    second.setAttribute('slot', 'body')
    second.textContent = 'Second'
    first.replaceWith(second)
    await waitForUpdate(el)
    expect(getSlot(el, 'body')?.assignedElements()[0].id).toBe('second')
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
    expect(getSlot(el, 'body')?.assignedElements()).toHaveLength(1)
    expect(getSlot(el, 'title')).toBeNull()
    cleanupElement(el)
  })
})
