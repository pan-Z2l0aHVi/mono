import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/editable-text'
import '@/components/input'
import '@/components/textarea'
import { cleanupElement, mountElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

type EditingControl = HTMLElement & {
  readonly updateComplete: Promise<unknown>
  value: string
  disabled: boolean
  readonly: boolean
  focus(options?: FocusOptions): void
  blur(): void
  select(): void
}

interface EditingControlSpec {
  tag: string
  label: string
  native: 'input' | 'textarea'
  /** 进入可接收用户编辑的状态；input / textarea 已始终可编辑。 */
  enterEditing?: (el: EditingControl) => Promise<void>
  /** 走该组件的公开提交路径派发 change。 */
  commit: (el: EditingControl) => void
}

const SPECS: readonly EditingControlSpec[] = [
  {
    tag: 'web-ui-input',
    label: 'WebUiInput',
    native: 'input',
    commit: el => nativeOf(el, 'input').dispatchEvent(new Event('change', { bubbles: true }))
  },
  {
    tag: 'web-ui-textarea',
    label: 'WebUiTextarea',
    native: 'textarea',
    commit: el => nativeOf(el, 'textarea').dispatchEvent(new Event('change', { bubbles: true }))
  },
  {
    tag: 'web-ui-editable-text',
    label: 'WebUiEditableText',
    native: 'textarea',
    enterEditing: async el => {
      el.focus()
      await waitForUpdate(el)
    },
    commit: el => nativeOf(el, 'textarea').dispatchEvent(new Event('blur'))
  }
]

function nativeOf(el: EditingControl, tag: 'input' | 'textarea'): HTMLInputElement | HTMLTextAreaElement {
  return queryA11y(el, tag) as HTMLInputElement | HTMLTextAreaElement
}

function dispatchInput(native: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  native.value = value
  native.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
}

for (const spec of SPECS) {
  describe(`${spec.label} 与同类文本控件的公共 API 一致性`, () => {
    const mount = (attrs?: Record<string, string>): EditingControl => mountElement<EditingControl>(spec.tag, { attrs })

    it('公开 focus/blur/select，且 value 是可读写字符串', async () => {
      const el = mount()
      const [inputs, detachInputs] = spyEvents(el, 'input')
      const [changes, detachChanges] = spyEvents(el, 'change')
      try {
        await waitForUpdate(el)
        expect(typeof el.focus).toBe('function')
        expect(typeof el.blur).toBe('function')
        expect(typeof el.select).toBe('function')

        el.value = 'programmatic'
        await waitForUpdate(el)

        expect(el.value).toBe('programmatic')
        expect(nativeOf(el, spec.native).value).toBe('programmatic')
        expect(inputs).toHaveLength(0)
        expect(changes).toHaveLength(0)
      } finally {
        detachInputs()
        detachChanges()
        cleanupElement(el)
      }
    })

    it('用户输入派发一次 input，组件提交路径恰好派发一次 change', async () => {
      const el = mount({ value: 'start' })
      const [inputs, detachInputs] = spyEvents(el, 'input')
      const [changes, detachChanges] = spyEvents(el, 'change')
      try {
        await waitForUpdate(el)
        await spec.enterEditing?.(el)

        dispatchInput(nativeOf(el, spec.native), 'typed')
        await waitForUpdate(el)
        expect(el.value).toBe('typed')
        expect(inputs).toHaveLength(1)
        expect(changes).toHaveLength(0)

        spec.commit(el)
        await waitForUpdate(el)
        expect(changes).toHaveLength(1)
      } finally {
        detachInputs()
        detachChanges()
        cleanupElement(el)
      }
    })

    it('disabled 时 focus/select 都不产生效果', async () => {
      const el = mount({ value: 'hello' })
      try {
        await waitForUpdate(el)
        const native = nativeOf(el, spec.native)
        native.setSelectionRange(1, 1)
        el.disabled = true
        await waitForUpdate(el)

        el.focus()
        el.select()
        await waitForUpdate(el)

        expect(el.shadowRoot?.activeElement).toBeNull()
        expect(el.hasAttribute('editing')).toBe(false)
        expect(native.selectionStart).toBe(1)
        expect(native.selectionEnd).toBe(1)
      } finally {
        cleanupElement(el)
      }
    })

    it('readonly 仍可聚焦、全选和复制，但不接受值变更或提交 change', async () => {
      const el = mount({ value: 'hello' })
      const [changes, detachChanges] = spyEvents(el, 'change')
      try {
        await waitForUpdate(el)
        el.readonly = true
        await waitForUpdate(el)

        const native = nativeOf(el, spec.native)
        expect(native.readOnly).toBe(true)

        el.focus()
        el.select()
        await waitForUpdate(el)

        expect(el.shadowRoot?.activeElement).toBe(native)
        expect(native.selectionStart).toBe(0)
        expect(native.selectionEnd).toBe(5)

        dispatchInput(native, 'blocked')
        await waitForUpdate(el)
        expect(el.value).toBe('hello')

        spec.commit(el)
        await waitForUpdate(el)
        expect(el.value).toBe('hello')
        expect(changes).toHaveLength(0)
      } finally {
        detachChanges()
        cleanupElement(el)
      }
    })
  })
}
