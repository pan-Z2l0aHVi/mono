import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/input'
import '@/components/textarea'
import { cleanupElement, flushSlotChange, mountElement, queryA11y } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

type SlottedControl = HTMLElement & { updateComplete: Promise<unknown> }

/**
 * 命名 slot 的「分配数量」是公开契约：它决定消费者提供的内容是否真的被投影。
 * 查询一律走 `slot[name=...]`（公开投影面），不触碰 shadowRoot 内部 class。
 */
const CONTROLS: ReadonlyArray<readonly [tag: string, label: string]> = [
  ['web-ui-input', 'WebUiInput'],
  ['web-ui-textarea', 'WebUiTextarea']
]

const slotOf = (el: HTMLElement, name: 'prefix' | 'suffix'): HTMLSlotElement =>
  queryA11y(el, `slot[name="${name}"]`) as HTMLSlotElement

const span = (id: string, slot: string, text: string): HTMLSpanElement => {
  const node = document.createElement('span')
  node.id = id
  node.setAttribute('slot', slot)
  node.textContent = text
  return node
}

for (const [tag, label] of CONTROLS) {
  describe(`${label} named-slot presence（jsdom）`, () => {
    it('初始无 prefix/suffix 内容时不分配节点', async () => {
      const el = mountElement<SlottedControl>(tag)
      await flushSlotChange(el)
      expect(slotOf(el, 'prefix').assignedElements()).toHaveLength(0)
      expect(slotOf(el, 'suffix').assignedElements()).toHaveLength(0)
      cleanupElement(el)
    })

    it('后续插入 prefix/suffix 内容后立即同步分配', async () => {
      const el = mountElement<SlottedControl>(tag)
      await flushSlotChange(el)

      el.innerHTML = '<span id="prefix" slot="prefix">$</span>'
      await flushSlotChange(el)
      expect(slotOf(el, 'prefix').assignedElements()).toHaveLength(1)

      el.querySelector('#prefix')!.insertAdjacentHTML('afterend', '<span id="suffix" slot="suffix">USD</span>')
      await flushSlotChange(el)
      expect(slotOf(el, 'suffix').assignedElements()).toHaveLength(1)
      cleanupElement(el)
    })

    it('移除和替换条件渲染内容时同步分配数量', async () => {
      const el = mountElement<SlottedControl>(tag, {
        html: '<span id="direct-prefix" slot="prefix">$</span><span id="first-suffix" slot="suffix">USD</span>'
      })
      await flushSlotChange(el)
      expect(slotOf(el, 'prefix').assignedElements()).toHaveLength(1)
      expect(slotOf(el, 'suffix').assignedElements()).toHaveLength(1)

      el.querySelector('#direct-prefix')!.remove()
      await flushSlotChange(el)
      expect(slotOf(el, 'prefix').assignedElements()).toHaveLength(0)

      el.querySelector('#first-suffix')!.replaceWith(span('replacement-suffix', 'suffix', 'HKD'))
      await flushSlotChange(el)
      expect(slotOf(el, 'suffix').assignedElements()).toHaveLength(1)
      cleanupElement(el)
    })

    it('断开期间修改 slot 内容，重连后分配状态仍然正确', async () => {
      const el = mountElement<SlottedControl>(tag, {
        html: '<span id="detached-suffix" slot="suffix">USD</span>'
      })
      await flushSlotChange(el)
      expect(slotOf(el, 'suffix').assignedElements()).toHaveLength(1)

      el.remove()
      el.insertAdjacentHTML('afterbegin', '<span id="detached-prefix" slot="prefix">€</span>')
      el.querySelector('#detached-suffix')!.remove()

      document.body.append(el)
      await flushSlotChange(el)
      expect(slotOf(el, 'prefix').assignedElements()).toHaveLength(1)
      expect(slotOf(el, 'suffix').assignedElements()).toHaveLength(0)
      cleanupElement(el)
    })
  })
}
