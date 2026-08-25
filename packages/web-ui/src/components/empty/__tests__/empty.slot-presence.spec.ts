import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiEmpty } from '..'

afterEach(() => document.body.replaceChildren())

function createEmpty(initialHTML = ''): WebUiEmpty {
  const el = document.createElement('web-ui-empty')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

function getSlot(el: WebUiEmpty, selector: string): HTMLSlotElement {
  return queryA11y(el, selector) as HTMLSlotElement
}

describe('WebUiEmpty named-slot presence（jsdom）', () => {
  it('后续插入默认、description 和 action 内容时同步分配', async () => {
    const el = createEmpty()
    await waitForUpdate(el)

    el.insertAdjacentHTML('afterbegin', '<strong id="title">No data</strong>')
    await waitForUpdate(el)
    expect(getSlot(el, 'slot:not([name])').assignedElements()).toHaveLength(1)

    el.insertAdjacentHTML('beforeend', '<span id="description" slot="description">Try again later</span>')
    await waitForUpdate(el)
    expect(getSlot(el, 'slot[name="description"]').assignedElements()).toHaveLength(1)

    el.insertAdjacentHTML('beforeend', '<button id="action" slot="action">Reload</button>')
    await waitForUpdate(el)
    expect(getSlot(el, 'slot[name="action"]').assignedElements()).toHaveLength(1)
    cleanupElement(el)
  })

  it('action 条件包装替换和移除后保持分配同步', async () => {
    const el = createEmpty('<button id="first" slot="action">First</button>')
    await waitForUpdate(el)
    expect(getSlot(el, 'slot[name="action"]').assignedElements()).toHaveLength(1)

    const first = el.querySelector('#first')!
    const second = document.createElement('button')
    second.id = 'second'
    second.setAttribute('slot', 'action')
    first.replaceWith(second)
    await waitForUpdate(el)
    expect(getSlot(el, 'slot[name="action"]').assignedElements()).toHaveLength(1)
    expect(el.querySelector('#first')).toBeNull()

    el.querySelector('[slot="action"]')!.remove()
    await waitForUpdate(el)
    expect(getSlot(el, 'slot[name="action"]').assignedElements()).toHaveLength(0)
    cleanupElement(el)
  })

  it('断开期间替换 action 内容，重连后显示新内容', async () => {
    const el = createEmpty('<button id="first" slot="action">First</button>')
    await waitForUpdate(el)

    el.remove()
    el.querySelector('#first')!.setAttribute('id', 'second')
    el.querySelector('#second')!.textContent = 'Second'

    document.body.append(el)
    await flush()
    expect(getSlot(el, 'slot[name="action"]').assignedElements()).toHaveLength(1)
    expect(el.querySelector('#second')?.textContent).toBe('Second')
    cleanupElement(el)
  })
})
