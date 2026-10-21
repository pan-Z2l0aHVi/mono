import '..'
import '@/components/radio'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { waitForUpdate } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }
type RadioGroupElement = Updatable & { value: string }

function createGroup(options: { disabled?: boolean; required?: boolean } = {}): RadioGroupElement {
  const label = document.createElement('span')
  label.id = 'plan-label'
  label.textContent = '套餐'

  const group = document.createElement('web-ui-radio-group') as RadioGroupElement
  group.setAttribute('aria-labelledby', label.id)
  group.setAttribute('direction', 'horizontal')
  if (options.disabled) group.setAttribute('disabled', '')
  if (options.required) group.setAttribute('required', '')

  for (const [value, text] of [
    ['basic', '基础版'],
    ['pro', '专业版']
  ]) {
    const radio = document.createElement('web-ui-radio')
    radio.setAttribute('value', value)
    radio.textContent = text
    group.append(radio)
  }

  document.body.append(label, group)
  return group
}

describe('WebUiRadioGroup 无障碍语义（浏览器）', () => {
  it('暴露可访问名称、radiogroup 与 radio 角色', async () => {
    const host = createGroup({ required: true })
    await waitForUpdate(host)
    await Promise.all([...host.querySelectorAll<Updatable>('web-ui-radio')].map(radio => radio.updateComplete))

    const group = page.getByRole('radiogroup', { name: '套餐' })
    expect(group.length).toBe(1)
    expect(group.element()).toBe(host)
    expect(group.element().tagName.toLowerCase()).toBe('web-ui-radio-group')
    expect(group.element().getAttribute('aria-orientation')).toBe('horizontal')
    expect(group.element().getAttribute('aria-disabled')).toBe('false')
    expect(group.element().getAttribute('aria-required')).toBe('true')
    expect(page.getByRole('radio').length).toBe(2)
    expect(host.shadowRoot?.querySelector('slot')?.assignedElements()).toHaveLength(2)

    const label = document.querySelector<HTMLElement>('#plan-label')!
    label.textContent = '更新后的套餐'
    await Promise.resolve()
    await waitForUpdate(host)
    expect(page.getByRole('radiogroup', { name: '更新后的套餐' }).length).toBe(1)
  })

  it('方向键按排列方向移动焦点和选中态，并循环到首项', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
    await Promise.all(radios.map(radio => radio.updateComplete))
    const childInputs: Event[] = []
    for (const radio of radios) radio.addEventListener('input', event => childInputs.push(event))

    radios[0]?.focus()
    await userEvent.keyboard('{ArrowRight}')
    await waitForUpdate(host)
    await Promise.all(radios.map(radio => radio.updateComplete))

    expect(host.value).toBe('pro')
    expect(childInputs).toHaveLength(1)
    expect(document.activeElement).toBe(radios[1])
    expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
    expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')

    await userEvent.keyboard('{ArrowRight}')
    await waitForUpdate(host)

    expect(host.value).toBe('basic')
    expect(childInputs).toHaveLength(2)
    expect(document.activeElement).toBe(radios[0])
  })

  it('跳过 fieldset 动态禁用的 radio', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]

    const next = document.createElement('web-ui-radio') as Updatable
    next.setAttribute('value', 'enterprise')
    next.textContent = '企业版'
    host.append(next)

    const fieldset = document.createElement('fieldset')
    fieldset.append(radios[1]!)
    host.insertBefore(fieldset, next)
    await waitForUpdate(host)
    await Promise.all([...radios, next].map(radio => radio.updateComplete))

    fieldset.disabled = true
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all([...radios, next].map(radio => radio.updateComplete))

    expect(radios[1]?.matches(':disabled')).toBe(true)
    radios[0]?.focus()
    await userEvent.keyboard('{ArrowRight}')
    await waitForUpdate(host)
    await Promise.all([...radios, next].map(radio => radio.updateComplete))

    expect(host.value).toBe('enterprise')
    expect(document.activeElement).toBe(next)
    expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
  })
})
