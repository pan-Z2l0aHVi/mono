import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiTextarea } from '..'

afterEach(() => document.body.replaceChildren())

function createTextarea(initialHTML = ''): WebUiTextarea {
  const el = document.createElement('web-ui-textarea')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

function makeSpan(id: string, slot: string, text: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.id = id
  span.setAttribute('slot', slot)
  span.textContent = text
  return span
}

function getSlot(el: WebUiTextarea, name: 'prefix' | 'suffix'): HTMLSlotElement {
  return queryA11y(el, `slot[name="${name}"]`) as HTMLSlotElement
}

async function expectAssigned(el: WebUiTextarea, name: 'prefix' | 'suffix', count: number) {
  await waitForUpdate(el)
  expect(getSlot(el, name).assignedElements()).toHaveLength(count)
}

describe('WebUiTextarea named-slot presence（jsdom）', () => {
  it('初始无 prefix/suffix 内容时不分配节点', async () => {
    const el = createTextarea()
    await waitForUpdate(el)
    expect(getSlot(el, 'prefix').assignedElements()).toHaveLength(0)
    expect(getSlot(el, 'suffix').assignedElements()).toHaveLength(0)
    cleanupElement(el)
  })

  it('后续插入 prefix/suffix 内容后立即同步分配', async () => {
    const el = createTextarea()
    await waitForUpdate(el)

    el.innerHTML = '<span id="prefix" slot="prefix">@</span>'
    await waitForUpdate(el)
    expect(getSlot(el, 'prefix').assignedElements()).toHaveLength(1)
    el.querySelector('#prefix')!.insertAdjacentHTML('afterend', '<span id="suffix" slot="suffix">ok</span>')
    await waitForUpdate(el)
    expect(getSlot(el, 'suffix').assignedElements()).toHaveLength(1)
    cleanupElement(el)
  })

  it('移除和替换条件渲染内容时同步分配数量', async () => {
    const el = createTextarea(`
      <span id="direct-prefix" slot="prefix">@</span>
      <span id="first-suffix" slot="suffix">ok</span>
    `)
    await expectAssigned(el, 'prefix', 1)
    await expectAssigned(el, 'suffix', 1)

    el.querySelector('#direct-prefix')!.remove()
    await flush()
    expect(getSlot(el, 'prefix').assignedElements()).toHaveLength(0)

    el.querySelector('#first-suffix')!.replaceWith(makeSpan('replacement-suffix', 'suffix', 'done'))
    await flush()
    expect(getSlot(el, 'suffix').assignedElements()).toHaveLength(1)
    cleanupElement(el)
  })

  it('断开期间修改 slot 内容，重连后分配状态仍然正确', async () => {
    const el = createTextarea('<span id="detached-suffix" slot="suffix">ok</span>')
    await expectAssigned(el, 'suffix', 1)

    el.remove()
    el.insertAdjacentHTML('afterbegin', '<span id="detached-prefix" slot="prefix">@</span>')
    el.querySelector('#detached-suffix')!.remove()

    document.body.append(el)
    await flush()
    expect(getSlot(el, 'prefix').assignedElements()).toHaveLength(1)
    expect(getSlot(el, 'suffix').assignedElements()).toHaveLength(0)
    cleanupElement(el)
  })
})
