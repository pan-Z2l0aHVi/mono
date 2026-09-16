import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/checkbox'
import '@/components/radio'
import '@/components/switch'
import {
  cleanupElement,
  contractEvent,
  contractReflection,
  mountElement,
  queryA11y,
  setProperty,
  spyEvents,
  waitForUpdate
} from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

type ChoiceControl = HTMLElement & {
  updateComplete: Promise<unknown>
  checked: boolean
  value: string
  name: string
  disabled: boolean
  required: boolean
}

interface ChoiceSpec {
  tag: string
  label: string
  role: 'checkbox' | 'radio' | 'switch'
  /**
   * 是否在本矩阵内覆盖键盘切换。checkbox / radio 自行处理 keydown，可在 jsdom 合成验证；
   * switch 不处理 keydown，其键盘可达性来自 label 内视觉隐藏的原生 checkbox 的**原生激活**
   * 行为——jsdom 不合成该行为，因此由 `switch-keyboard.browser.spec.ts` 在真实浏览器中覆盖。
   */
  keyboard: boolean
  /** 禁用态是否置 aria-disabled；switch 未渲染该属性 */
  ariaDisabled: boolean
}

const CONTROLS: ReadonlyArray<ChoiceSpec> = [
  { tag: 'web-ui-checkbox', label: 'WebUiCheckbox', role: 'checkbox', keyboard: true, ariaDisabled: true },
  { tag: 'web-ui-radio', label: 'WebUiRadio', role: 'radio', keyboard: true, ariaDisabled: true },
  { tag: 'web-ui-switch', label: 'WebUiSwitch', role: 'switch', keyboard: false, ariaDisabled: false }
]

/** 三者共有且均 `reflect: true` 的属性。注意 `value` 与 `checked` 都不反射。 */
const SHARED_REFLECTION: ReadonlyArray<readonly [string, unknown, string, string]> = [
  ['name', 'field', 'name', 'field'],
  ['disabled', true, 'disabled', ''],
  ['required', true, 'required', '']
]

const mount = (spec: ChoiceSpec): ChoiceControl => mountElement<ChoiceControl>(spec.tag)

/** 断言语义角色存在后返回它；缺角色时立即失败，而不是抛出隐晦的 TypeError。 */
const controlOf = (spec: ChoiceSpec, el: ChoiceControl): HTMLElement => {
  const node = queryA11y(el, `[role="${spec.role}"]`)
  expect(node, `未找到 role="${spec.role}" 的可交互元素`).toBeTruthy()
  return node as HTMLElement
}

for (const spec of CONTROLS) {
  describe(`${spec.label} 选择控件契约`, () => {
    it('checked 默认值为 false', async () => {
      const el = mount(spec)
      await waitForUpdate(el)
      expect(el.checked).toBe(false)
      cleanupElement(el)
    })

    it('设置 checked 不反射到宿主，value 也不反射', async () => {
      const el = mount(spec)
      setProperty(el, 'value', 'yes')
      await waitForUpdate(el)
      expect(el.value).toBe('yes')

      setProperty(el, 'checked', true)
      await waitForUpdate(el)
      expect(el.checked).toBe(true)
      expect(el.hasAttribute('checked')).toBe(false)
      expect(el.hasAttribute('value')).toBe(false)
      cleanupElement(el)
    })

    it(`拥有 role="${spec.role}" 且 aria-checked 随状态更新`, async () => {
      const el = mount(spec)
      await waitForUpdate(el)
      expect(controlOf(spec, el).getAttribute('aria-checked')).toBe('false')

      setProperty(el, 'checked', true)
      await waitForUpdate(el)
      expect(controlOf(spec, el).getAttribute('aria-checked')).toBe('true')
      cleanupElement(el)
    })

    contractReflection(`${spec.label} 反射契约`, () => mount(spec), SHARED_REFLECTION)

    contractEvent(`${spec.label} 事件契约`, () => mount(spec), [
      {
        title: '编程式设置 checked 不派发 input / change',
        act: el => setProperty(el, 'checked', true),
        counts: { input: 0, change: 0 }
      },
      {
        title: '点击切换派发一次 input 与 change',
        act: el => controlOf(spec, el).click(),
        counts: { input: 1, change: 1 }
      }
    ])

    it('disabled 时点击不切换状态且不派发事件', async () => {
      const el = mount(spec)
      setProperty(el, 'disabled', true)
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      controlOf(spec, el).click()
      await waitForUpdate(el)

      expect(el.checked).toBe(false)
      expect(inputEvents).toHaveLength(0)
      expect(changeEvents).toHaveLength(0)
      cleanupElement(el)
    })
  })
}

// 下列能力并非三控件共有的公开契约，因此按能力筛选控件列表来注册用例，
// 而不是在测试注册作用域内写条件语句（`vitest/no-conditional-tests`）。

for (const spec of CONTROLS.filter(candidate => candidate.ariaDisabled)) {
  describe(`${spec.label} disabled 语义`, () => {
    it('disabled 时 aria-disabled 置位', async () => {
      const el = mount(spec)
      await waitForUpdate(el)
      expect(controlOf(spec, el).getAttribute('aria-disabled')).toBe('false')

      setProperty(el, 'disabled', true)
      await waitForUpdate(el)
      expect(controlOf(spec, el).getAttribute('aria-disabled')).toBe('true')
      cleanupElement(el)
    })
  })
}

for (const spec of CONTROLS.filter(candidate => candidate.keyboard)) {
  describe(`${spec.label} 键盘契约`, () => {
    it('空格键切换并派发 input / change', async () => {
      const el = mount(spec)
      await waitForUpdate(el)

      const [inputEvents] = spyEvents(el, 'input')
      const [changeEvents] = spyEvents(el, 'change')
      controlOf(spec, el).dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      await waitForUpdate(el)

      expect(el.checked).toBe(true)
      expect(inputEvents).toHaveLength(1)
      expect(changeEvents).toHaveLength(1)
      cleanupElement(el)
    })

    it('Enter 键切换', async () => {
      const el = mount(spec)
      await waitForUpdate(el)

      controlOf(spec, el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await waitForUpdate(el)

      expect(el.checked).toBe(true)
      cleanupElement(el)
    })
  })
}
