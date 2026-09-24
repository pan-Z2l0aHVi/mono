import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/input'
import '@/components/input-number'
import '@/components/textarea'
import {
  cleanupElement,
  contractEvent,
  contractReflection,
  mountElement,
  queryA11y,
  setProperty,
  waitForUpdate
} from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

type TextControl = HTMLElement & { updateComplete: Promise<unknown>; value: string | number }

interface TextControlSpec {
  tag: string
  label: string
  /** shadow 中承载用户输入的原生控件标签 */
  native: 'input' | 'textarea'
  /** value 默认值的可读描述（用于标题） */
  defaultLabel: string
  defaultValue: string | number
  /** 编程式设值用的探针值 */
  probeValue: string | number
  /** 该控件额外声明且反射到宿主的属性 */
  extra: ReadonlyArray<readonly [prop: string, value: unknown, attr: string, expected: string]>
}

/**
 * 三个文本控件的**共有**契约。只收录三者行为逐字一致的项；
 * `input` / `textarea` / `editable-text` 的跨组件一致性另见
 * `text-editing-api-consistency.spec.ts`；input-number 与 editable-text 的
 * 提交/反射模型不同，不并入本矩阵。
 */
const SHARED_REFLECTION: ReadonlyArray<readonly [string, unknown, string, string]> = [
  ['disabled', true, 'disabled', ''],
  ['placeholder', '请输入', 'placeholder', '请输入'],
  ['name', 'field', 'name', 'field'],
  ['required', true, 'required', ''],
  ['readonly', true, 'readonly', '']
]

const CONTROLS: ReadonlyArray<TextControlSpec> = [
  {
    tag: 'web-ui-input',
    label: 'WebUiInput',
    native: 'input',
    defaultLabel: '空字符串',
    defaultValue: '',
    probeValue: 'probe',
    extra: [
      ['type', 'password', 'type', 'password'],
      ['clearable', true, 'clearable', ''],
      ['full', true, 'full', ''],
      ['borderless', true, 'borderless', ''],
      ['value', 'hello', 'value', 'hello']
    ]
  },
  {
    tag: 'web-ui-textarea',
    label: 'WebUiTextarea',
    native: 'textarea',
    defaultLabel: '空字符串',
    defaultValue: '',
    probeValue: 'probe',
    extra: [
      ['rows', 5, 'rows', '5'],
      ['full', true, 'full', ''],
      ['borderless', true, 'borderless', ''],
      ['autosize', true, 'autosize', ''],
      ['maxHeight', 120, 'max-height', '120'],
      ['value', 'hello', 'value', 'hello']
    ]
  },
  {
    tag: 'web-ui-input-number',
    label: 'WebUiInputNumber',
    native: 'input',
    defaultLabel: '0',
    defaultValue: 0,
    probeValue: 42,
    extra: [
      ['precision', 2, 'precision', '2'],
      ['value', 42, 'value', '42']
    ]
  }
]

for (const spec of CONTROLS) {
  const mount = (): TextControl => mountElement<TextControl>(spec.tag)
  const nativeOf = (el: TextControl): HTMLInputElement => queryA11y(el, spec.native) as HTMLInputElement

  describe(`${spec.label} 文本控件契约`, () => {
    it(`value 默认 ${spec.defaultLabel} 且 disabled 默认 false`, async () => {
      const el = mount()
      await waitForUpdate(el)
      expect(el.value).toBe(spec.defaultValue)
      expect((el as unknown as { disabled: boolean }).disabled).toBe(false)
      cleanupElement(el)
    })

    it('formAssociated 已声明', () => {
      expect((customElements.get(spec.tag) as unknown as { formAssociated: boolean }).formAssociated).toBe(true)
    })

    contractReflection(`${spec.label} 共有属性反射`, mount, SHARED_REFLECTION)
    contractReflection(`${spec.label} 特有属性反射`, mount, spec.extra)

    it('readonly 同步到 shadow 中的原生控件', async () => {
      const el = mount()
      setProperty(el, 'readonly', true)
      await waitForUpdate(el)
      expect(nativeOf(el).hasAttribute('readonly')).toBe(true)
      cleanupElement(el)
    })

    it('shadow 原生控件有稳定且实例唯一的 id', async () => {
      const first = mount()
      const second = mount()
      await Promise.all([waitForUpdate(first), waitForUpdate(second)])

      const firstNative = nativeOf(first)
      const secondNative = nativeOf(second)
      const initialId = firstNative.id
      expect(initialId).not.toBe('')
      expect(secondNative.id).not.toBe('')
      expect(secondNative.id).not.toBe(initialId)

      setProperty(first, 'value', spec.probeValue)
      await waitForUpdate(first)
      expect(nativeOf(first).id).toBe(initialId)

      cleanupElement(first)
      cleanupElement(second)
    })

    it('设置 value 后原生控件值同步', async () => {
      const el = mount()
      setProperty(el, 'value', spec.probeValue)
      await waitForUpdate(el)
      expect(nativeOf(el).value).toBe(String(spec.probeValue))
      cleanupElement(el)
    })

    it('用户输入后宿主 value 同步', async () => {
      const el = mount()
      await waitForUpdate(el)

      const native = nativeOf(el)
      native.value = String(spec.probeValue)
      native.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      await waitForUpdate(el)

      expect(el.value).toBe(spec.probeValue)
      cleanupElement(el)
    })

    contractEvent(`${spec.label} 事件契约`, mount, [
      {
        title: '编程式设值不派发 input / change',
        act: el => setProperty(el, 'value', spec.probeValue),
        counts: { input: 0, change: 0 }
      },
      {
        title: '用户输入派发一次 input 且不派发 change',
        act: el => {
          const native = nativeOf(el)
          native.value = String(spec.probeValue)
          native.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        },
        counts: { input: 1, change: 0 }
      },
      {
        title: '原生 change 转发为一次宿主 change',
        act: el => {
          const native = nativeOf(el)
          native.value = String(spec.probeValue)
          native.dispatchEvent(new Event('change', { bubbles: true }))
        },
        counts: { change: 1 }
      },
      {
        title: '原生 focus 转发为一次宿主 focus',
        act: el => {
          nativeOf(el).dispatchEvent(new Event('focus', { bubbles: true, composed: true }))
        },
        counts: { focus: 1 }
      },
      {
        title: '原生 blur 转发为一次宿主 blur',
        act: el => {
          nativeOf(el).dispatchEvent(new Event('blur', { bubbles: true, composed: true }))
        },
        counts: { blur: 1 }
      }
    ])
  })
}
