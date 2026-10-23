import '..'
import '@/components/radio'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { waitForUpdate } from '@/shared/test-utils'
import { setViewport } from '@/shared/test-utils/viewport'

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

  it('调用 focus 不会把焦点移到禁用 radio', async () => {
    const host = createGroup({ disabled: true })
    await waitForUpdate(host)
    const radio = host.querySelector<Updatable>('web-ui-radio')!
    await radio.updateComplete

    radio.focus()

    expect(document.activeElement).toBe(document.body)
    expect(radio.shadowRoot?.activeElement).toBeNull()
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

  it('嵌套 radio group 的方向键只操作最近的组', async () => {
    const outer = createGroup()
    await waitForUpdate(outer)
    const outerRadios = [...outer.querySelectorAll<Updatable>('web-ui-radio')]
    const inner = document.createElement('web-ui-radio-group') as RadioGroupElement
    inner.setAttribute('direction', 'horizontal')
    const innerRadios: Updatable[] = []
    for (const [value, text] of [
      ['inner-basic', '内组基础版'],
      ['inner-pro', '内组专业版']
    ]) {
      const radio = document.createElement('web-ui-radio') as Updatable
      radio.setAttribute('value', value)
      radio.textContent = text
      innerRadios.push(radio)
      inner.append(radio)
    }

    const outerContent = document.createElement('div')
    outerContent.append(outerRadios[0]!, inner, outerRadios[1]!)
    outer.append(outerContent)
    await waitForUpdate(outer)
    await waitForUpdate(inner)
    await Promise.all([...outerRadios, ...innerRadios].map(radio => radio.updateComplete))
    inner.value = 'inner-pro'
    await waitForUpdate(inner)
    await Promise.all(innerRadios.map(radio => radio.updateComplete))

    innerRadios[1]?.focus()
    await userEvent.keyboard('{ArrowRight}')
    await waitForUpdate(inner)
    await waitForUpdate(outer)
    await Promise.all([...outerRadios, ...innerRadios].map(radio => radio.updateComplete))

    expect(inner.value).toBe('inner-basic')
    expect(outer.value).toBe('')
    expect(innerRadios[0]?.shadowRoot?.activeElement).toBe(innerRadios[0]?.shadowRoot?.querySelector('[role="radio"]'))
    expect(outerRadios[1]?.shadowRoot?.activeElement).toBeNull()
  })

  it('当前焦点项被禁用后，方向键从该位置继续移动', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable & { disabled: boolean }>('web-ui-radio')]
    const next = document.createElement('web-ui-radio') as Updatable
    next.setAttribute('value', 'enterprise')
    next.textContent = '企业版'
    host.append(next)
    await waitForUpdate(host)
    await Promise.all([...radios, next].map(radio => radio.updateComplete))

    host.value = 'pro'
    await waitForUpdate(host)
    radios[1]?.focus()
    if (radios[1]) radios[1].disabled = true
    await waitForUpdate(radios[1] as Updatable)

    radios[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    await waitForUpdate(host)
    await Promise.all([...radios, next].map(radio => radio.updateComplete))

    expect(radios[1]?.matches(':disabled')).toBe(true)
    expect(host.value).toBe('enterprise')
    expect(document.activeElement).toBe(next)
  })

  it('隐藏成员及隐藏祖先下的成员不进入 tab stop 或方向键目标', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]

    const hiddenAncestor = document.createElement('div')
    radios[1]?.replaceWith(hiddenAncestor)
    if (radios[1]) hiddenAncestor.append(radios[1])

    const enterprise = document.createElement('web-ui-radio') as Updatable
    enterprise.setAttribute('value', 'enterprise')
    enterprise.textContent = '企业版'
    const ultimate = document.createElement('web-ui-radio') as Updatable
    ultimate.setAttribute('value', 'ultimate')
    ultimate.textContent = '旗舰版'
    host.append(enterprise, ultimate)
    await waitForUpdate(host)
    await Promise.all([...radios, enterprise, ultimate].map(radio => radio.updateComplete))

    if (radios[0]) radios[0].hidden = true
    hiddenAncestor.hidden = true
    ultimate.setAttribute('aria-hidden', 'true')
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all([...radios, enterprise, ultimate].map(radio => radio.updateComplete))

    expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
    expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
    expect(enterprise.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
    expect(ultimate.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')

    ultimate.focus()
    await userEvent.keyboard('{ArrowRight}')
    await waitForUpdate(host)
    await Promise.all([...radios, enterprise, ultimate].map(radio => radio.updateComplete))

    expect(host.value).toBe('enterprise')
    expect(document.activeElement).toBe(enterprise)
  })

  it('inert 与 CSS 隐藏成员不进入 tab stop 或方向键目标', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
    await Promise.all(radios.map(radio => radio.updateComplete))

    const displayNoneAncestor = document.createElement('div')
    radios[0]?.replaceWith(displayNoneAncestor)
    if (radios[0]) displayNoneAncestor.append(radios[0])
    displayNoneAncestor.style.display = 'none'
    const visibilityHiddenAncestor = document.createElement('div')
    radios[1]?.replaceWith(visibilityHiddenAncestor)
    if (radios[1]) {
      visibilityHiddenAncestor.append(radios[1])
      radios[1].style.visibility = 'visible'
    }
    visibilityHiddenAncestor.style.visibility = 'hidden'

    const enterprise = document.createElement('web-ui-radio') as Updatable
    enterprise.setAttribute('value', 'enterprise')
    enterprise.textContent = '企业版'
    const ultimate = document.createElement('web-ui-radio') as Updatable
    ultimate.setAttribute('value', 'ultimate')
    ultimate.textContent = '旗舰版'
    const inertAncestor = document.createElement('div')
    inertAncestor.inert = true
    inertAncestor.append(ultimate)
    host.append(enterprise, inertAncestor)
    await waitForUpdate(host)
    await Promise.all([...radios, enterprise, ultimate].map(radio => radio.updateComplete))
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all([...radios, enterprise, ultimate].map(radio => radio.updateComplete))

    expect(getComputedStyle(radios[1]!).visibility).toBe('visible')
    expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
    expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
    expect(enterprise.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
    expect(ultimate.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')

    ultimate.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    await waitForUpdate(host)
    expect(host.value).toBe('pro')

    if (radios[1]) radios[1].style.visibility = 'hidden'
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all([...radios, enterprise, ultimate].map(radio => radio.updateComplete))
    expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
    expect(enterprise.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')

    ultimate.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    await waitForUpdate(host)
    expect(host.value).toBe('enterprise')

    const outside = document.createElement('section')
    host.replaceWith(outside)
    outside.append(host)
    outside.style.display = 'none'
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all([...radios, enterprise, ultimate].map(radio => radio.updateComplete))
    expect(
      [...radios, enterprise, ultimate].every(
        radio => radio.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex') === '-1'
      )
    ).toBe(true)

    outside.style.display = ''
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all([...radios, enterprise, ultimate].map(radio => radio.updateComplete))
    expect(enterprise.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
  })

  it('radio group 位于 shadow root 时仍响应组合祖先的隐藏状态', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
    await Promise.all(radios.map(radio => radio.updateComplete))

    const outer = document.createElement('div')
    const shadowRoot = outer.attachShadow({ mode: 'open' })
    shadowRoot.append(host)
    document.body.append(outer)
    await waitForUpdate(host)
    await Promise.all(radios.map(radio => radio.updateComplete))

    outer.setAttribute('aria-hidden', 'true')
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all(radios.map(radio => radio.updateComplete))
    expect(
      radios.every(radio => radio.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex') === '-1')
    ).toBe(true)

    outer.removeAttribute('aria-hidden')
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all(radios.map(radio => radio.updateComplete))
    expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
  })

  it('打开原生 details 后恢复 radio group 的 tab stop', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
    await Promise.all(radios.map(radio => radio.updateComplete))

    const details = document.createElement('details')
    const summary = document.createElement('summary')
    summary.textContent = '套餐选项'
    host.remove()
    details.append(summary, host)
    document.body.append(details)
    await waitForUpdate(host)
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all(radios.map(radio => radio.updateComplete))

    expect(
      radios.every(radio => radio.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex') === '-1')
    ).toBe(true)

    details.open = true
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all(radios.map(radio => radio.updateComplete))

    expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
    expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
  })

  it('打开原生 popover 后恢复 radio group 的 tab stop', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
    await Promise.all(radios.map(radio => radio.updateComplete))

    const popover = document.createElement('div')
    popover.setAttribute('popover', 'auto')
    host.remove()
    popover.append(host)
    document.body.append(popover)
    await waitForUpdate(host)
    await Promise.all(radios.map(radio => radio.updateComplete))
    expect(
      radios.every(radio => radio.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex') === '-1')
    ).toBe(true)

    const opened = new Promise<void>(resolve => popover.addEventListener('toggle', () => resolve(), { once: true }))
    popover.showPopover()
    await opened
    await waitForUpdate(host)
    await Promise.all(radios.map(radio => radio.updateComplete))

    expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
    expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
    popover.hidePopover()
  })

  it('radio group 重新分配 slot 后改用新组合祖先计算 tab stop', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
    await Promise.all(radios.map(radio => radio.updateComplete))

    const shell = document.createElement('div')
    const shadow = shell.attachShadow({ mode: 'open' })
    const hiddenContainer = document.createElement('div')
    hiddenContainer.hidden = true
    const hiddenSlot = document.createElement('slot')
    hiddenSlot.name = 'hidden'
    hiddenContainer.append(hiddenSlot)
    const visibleContainer = document.createElement('div')
    const visibleSlot = document.createElement('slot')
    visibleSlot.name = 'visible'
    visibleContainer.append(visibleSlot)
    shadow.append(hiddenContainer, visibleContainer)
    document.body.append(shell)
    host.slot = 'hidden'
    shell.append(host)
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await waitForUpdate(host)
    await Promise.all(radios.map(radio => radio.updateComplete))

    expect(
      radios.every(radio => radio.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex') === '-1')
    ).toBe(true)

    host.slot = 'visible'
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await waitForUpdate(host)
    await Promise.all(radios.map(radio => radio.updateComplete))
    expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
    expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')

    visibleContainer.hidden = true
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all(radios.map(radio => radio.updateComplete))
    expect(
      radios.every(radio => radio.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex') === '-1')
    ).toBe(true)

    visibleContainer.hidden = false
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    await Promise.all(radios.map(radio => radio.updateComplete))
    expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
  })

  it('容器尺寸改变触发 container query 后更新 radio 的 tab stop', async () => {
    const style = document.createElement('style')
    style.textContent = `
      @container (max-width: 500px) {
        web-ui-radio[value="basic"] { visibility: hidden; }
      }
    `
    document.head.append(style)

    try {
      const host = createGroup()
      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'display: flex; width: 1000px; height: 1px'
      const container = document.createElement('div')
      container.style.cssText = 'container-type: inline-size; flex: 1 1 0; min-width: 0'
      const spacer = document.createElement('span')
      spacer.style.cssText = 'flex: 0 0 400px; height: 1px'
      const largerSpacer = document.createElement('span')
      largerSpacer.style.cssText = 'flex: 0 0 700px; height: 1px'
      host.remove()
      container.append(host)
      wrapper.append(container, spacer)
      document.body.append(wrapper)
      await waitForUpdate(host)
      const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
      await Promise.all(radios.map(radio => radio.updateComplete))
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

      expect(container.getBoundingClientRect().width).toBeGreaterThan(500)
      expect(getComputedStyle(radios[0]!).visibility).toBe('visible')
      expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')

      spacer.remove()
      wrapper.append(largerSpacer)
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      await Promise.all(radios.map(radio => radio.updateComplete))

      expect(container.getBoundingClientRect().width).toBeLessThanOrEqual(500)
      expect(getComputedStyle(radios[0]!).visibility).toBe('hidden')
      expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
      expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
    } finally {
      style.remove()
    }
  })

  it('媒体查询隐藏当前 tab stop 时切换到可见 radio', async () => {
    const previousViewport = { width: window.innerWidth, height: window.innerHeight }
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
    const style = document.createElement('style')
    style.textContent = '@media (max-width: 600px) { web-ui-radio[value="basic"] { visibility: hidden; } }'

    try {
      document.head.append(style)
      await setViewport(1280, 720)
      await Promise.all(radios.map(radio => radio.updateComplete))
      expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')

      await setViewport(390, 844)
      await Promise.all(radios.map(radio => radio.updateComplete))
      expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
      expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')

      await setViewport(1280, 720)
      await Promise.all(radios.map(radio => radio.updateComplete))
      expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
    } finally {
      style.remove()
      await setViewport(previousViewport.width, previousViewport.height)
    }
  })

  it('样式表改变 computed visibility 后更新 tab stop', async () => {
    const host = createGroup()
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
    const style = document.createElement('style')

    try {
      style.textContent = 'web-ui-radio[value="basic"] { visibility: hidden; }'
      document.head.append(style)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      await Promise.all(radios.map(radio => radio.updateComplete))
      expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
      expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')

      style.textContent = 'web-ui-radio[value="pro"] { visibility: hidden; }'
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      await Promise.all(radios.map(radio => radio.updateComplete))
      expect(radios[0]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('0')
      expect(radios[1]?.shadowRoot?.querySelector('[role="radio"]')?.getAttribute('tabindex')).toBe('-1')
    } finally {
      style.remove()
    }
  })

  it('horizontal RTL 组的左右键按视觉方向移动', async () => {
    const host = createGroup()
    host.setAttribute('dir', 'rtl')
    await waitForUpdate(host)
    const radios = [...host.querySelectorAll<Updatable>('web-ui-radio')]
    host.value = 'pro'
    await waitForUpdate(host)
    await Promise.all(radios.map(radio => radio.updateComplete))

    radios[1]?.focus()
    await userEvent.keyboard('{ArrowRight}')
    await waitForUpdate(host)
    await Promise.all(radios.map(radio => radio.updateComplete))

    expect(host.value).toBe('basic')
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
