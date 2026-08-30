import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import '..'
import '../../theme'
import type { WebUiOption } from '@/components/option'

import type { WebUiAutocomplete } from '..'

afterEach(() => document.body.replaceChildren())

async function waitForFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

function getPortalPanel(theme: HTMLElement): HTMLElement | null {
  const overlayContainer = theme.shadowRoot?.querySelector<HTMLElement>('[data-wui-overlay-container]')
  const portalHost = overlayContainer?.firstElementChild as HTMLElement | null
  return portalHost?.shadowRoot?.querySelector<HTMLElement>('.autocomplete-overlay') ?? null
}

describe('WebUiAutocomplete 组件（浏览器）', () => {
  it('Portal 打开后选项移入主题 overlay 容器并可点击选择', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.className = 'block'
    const el = document.createElement('web-ui-autocomplete')
    el.portal = true
    el.innerHTML =
      '<web-ui-option value="apple" label="Apple"></web-ui-option><web-ui-option value="banana" label="Banana"></web-ui-option>'
    theme.append(el)
    document.body.append(theme)
    await theme.updateComplete
    await el.updateComplete

    const input = el.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')
    input?.focus()
    await new Promise(resolve => requestAnimationFrame(resolve))
    await el.updateComplete

    const panel = getPortalPanel(theme)
    expect(el.open).toBe(true)
    expect(panel?.getAttribute('aria-hidden')).toBe('true')
    expect(panel?.querySelector(':scope web-ui-option')).toBeTruthy()

    const option = panel!.querySelector('web-ui-option') as HTMLElement
    option.click()
    await el.updateComplete

    expect(el.value).toBe('Apple')
    expect(el.selectedValue).toBe('apple')
    expect(el.open).toBe(false)
  })

  it('Portal 中 active option 通过同根 ARIA 镜像可被 combobox 获取', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    const el = document.createElement('web-ui-autocomplete')
    el.portal = true
    el.value = 'Apple'
    el.innerHTML =
      '<web-ui-option value="apple" label="Apple"></web-ui-option><web-ui-option value="banana" label="Banana"></web-ui-option>'
    theme.append(el)
    document.body.append(theme)
    await theme.updateComplete
    await el.updateComplete

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!
    input.focus()
    await new Promise(resolve => requestAnimationFrame(resolve))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    await el.updateComplete

    const activeId = input.getAttribute('aria-activedescendant')
    expect(el.shadowRoot?.querySelector(`#${activeId}`)?.textContent?.trim()).toBe('Apple')

    const active = getPortalPanel(theme)?.querySelector<WebUiOption>('web-ui-option[active]')
    if (!active) throw new Error('Expected a portal active option')
    active.remove()
    await new Promise(resolve => requestAnimationFrame(resolve))
    await el.updateComplete

    expect(el.selectedValue).toBe('')
    expect(input.getAttribute('aria-activedescendant')).toBeFalsy()
    expect(getPortalPanel(theme)?.querySelector('web-ui-option[active]')).toBeNull()
  })

  it('Portal 面板空白区域点击不会触发 outside close', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    const el = document.createElement('web-ui-autocomplete')
    el.portal = true
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    theme.append(el)
    document.body.append(theme)
    await theme.updateComplete
    await el.updateComplete

    el.shadowRoot?.querySelector<HTMLInputElement>('[role="combobox"]')?.focus()
    await new Promise(resolve => requestAnimationFrame(resolve))
    const panel = getPortalPanel(theme)!
    panel
      .querySelector<HTMLElement>('.autocomplete-scroll')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await el.updateComplete

    expect(el.open).toBe(true)
  })

  it('键入过滤后键盘选择匹配项', async () => {
    const el = document.createElement('web-ui-autocomplete')
    el.innerHTML =
      '<web-ui-option value="apple" label="Apple"></web-ui-option><web-ui-option value="banana" label="Banana"></web-ui-option>'
    document.body.append(el)
    await el.updateComplete

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!
    input.focus()
    await el.updateComplete

    input.value = 'app'
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await el.updateComplete

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    await el.updateComplete

    const activeId = input.getAttribute('aria-activedescendant')
    expect(el.shadowRoot?.querySelector(`#${activeId}`)?.textContent?.trim()).toBe('Apple')

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }))
    await el.updateComplete

    expect(el.value).toBe('Apple')
    expect(el.open).toBe(false)
  })

  it('无匹配候选时面板显示空状态文案', async () => {
    const el = document.createElement('web-ui-autocomplete')
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    document.body.append(el)
    await el.updateComplete

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!
    input.focus()
    await el.updateComplete

    input.value = 'zzz'
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await new Promise(resolve => requestAnimationFrame(resolve))
    await el.updateComplete

    const panel = el.shadowRoot?.querySelector<HTMLElement>('.autocomplete-overlay')
    expect(panel?.textContent).toContain('无匹配选项')
  })

  it('表单提交与重置', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-autocomplete name="city" value="Beijing"></web-ui-autocomplete>'
    document.body.append(form)
    const el = form.querySelector('web-ui-autocomplete')!
    await el.updateComplete

    expect(new FormData(form).get('city')).toBe('Beijing')

    el.value = 'Shanghai'
    await el.updateComplete
    expect(new FormData(form).get('city')).toBe('Shanghai')

    form.reset()
    await el.updateComplete
    expect(el.value).toBe('Beijing')
  })

  it('required 无值时阻塞提交，输入后通过', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-autocomplete name="city" required></web-ui-autocomplete>'
    document.body.append(form)
    const el = form.querySelector('web-ui-autocomplete')!
    await el.updateComplete

    expect(form.checkValidity()).toBe(false)

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!
    input.value = 'Shanghai'
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await el.updateComplete

    expect(form.checkValidity()).toBe(true)
    expect(new FormData(form).get('city')).toBe('Shanghai')
  })

  it('readonly 空值不阻塞提交（barred from validation）', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-autocomplete name="city" required readonly></web-ui-autocomplete>'
    document.body.append(form)
    const el = form.querySelector('web-ui-autocomplete')!
    await el.updateComplete

    expect(form.checkValidity()).toBe(true)
  })

  it('打开时锁定页面滚动，外部点击关闭后恢复', async () => {
    const el = document.createElement('web-ui-autocomplete')
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    document.body.append(el)
    await el.updateComplete

    el.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')?.focus()
    await el.updateComplete
    expect(document.body.style.position).toBe('fixed')

    document.body.click()
    await el.updateComplete
    expect(document.body.style.position).toBe('')
  })

  it('关闭和打开状态同步 accessibility tree 中的 listbox/options', async () => {
    const el = document.createElement('web-ui-autocomplete')
    el.innerHTML =
      '<web-ui-option value="apple" label="Apple"></web-ui-option><web-ui-option value="banana" label="Banana"></web-ui-option>'
    document.body.append(el)
    await el.updateComplete

    const host = page.elementLocator(el)
    const input = host.getByRole('combobox')

    expect(host.getByRole('listbox').length).toBe(0)

    input.element().focus()
    await waitForFrame()
    await waitForFrame()
    await el.updateComplete
    expect(host.getByRole('listbox').length).toBe(1)
    expect(host.getByRole('option', { name: 'Apple' }).length).toBe(1)

    await userEvent.keyboard('{ArrowDown}')
    expect(host.getByRole('option', { name: 'Apple' }).length).toBe(1)
    const activeId = input.element().getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(el.shadowRoot?.querySelector(`#${activeId}`)?.getAttribute('role')).toBe('option')

    await userEvent.keyboard('{Escape}')
    expect(host.getByRole('listbox').length).toBe(0)

    await userEvent.keyboard('{ArrowDown}')
    expect(host.getByRole('listbox').length).toBe(1)
  })

  it('Portal 模式下 mirror 只在 open 状态进入 accessibility tree', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    const el = document.createElement('web-ui-autocomplete')
    el.portal = true
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    theme.append(el)
    document.body.append(theme)
    await theme.updateComplete
    await el.updateComplete

    const input = page.getByRole('combobox')
    expect(page.getByRole('listbox').length).toBe(0)

    input.element().focus()
    await waitForFrame()
    await waitForFrame()
    await el.updateComplete
    expect(page.getByRole('listbox').length).toBe(1)
    await userEvent.keyboard('{ArrowDown}')
    expect(page.getByRole('option', { name: 'Apple' }).length).toBe(1)

    const activeId = input.element().getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(el.shadowRoot?.querySelector(`#${activeId}`)?.textContent?.trim()).toBe('Apple')
    expect(page.getByRole('option', { name: 'Apple' }).length).toBe(1)

    await userEvent.keyboard('{Escape}')
    expect(page.getByRole('listbox').length).toBe(0)
    await userEvent.keyboard('{ArrowDown}')
    expect(page.getByRole('listbox').length).toBe(1)
  })

  it('Portal 打开后动态插入、删除、reorder 的 option 保持 visual/mirror/registry 一致', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    const el = document.createElement('web-ui-autocomplete')
    el.portal = true
    el.innerHTML =
      '<web-ui-option value="apple" label="Apple"></web-ui-option><web-ui-option value="banana" label="Banana"></web-ui-option>'
    theme.append(el)
    document.body.append(theme)
    await theme.updateComplete
    await el.updateComplete

    const input = page.getByRole('combobox')
    input.element().focus()
    await waitForFrame()
    await waitForFrame()
    await el.updateComplete
    expect(page.getByRole('listbox').length).toBe(1)

    const appended = document.createElement('web-ui-option')
    appended.value = 'cherry'
    appended.label = 'Cherry'
    el.append(appended)
    await waitForFrame()
    await el.updateComplete

    const panel = getPortalPanel(theme)!
    expect(panel.querySelector('web-ui-option[value="cherry"]')).toBe(appended)
    expect(page.getByRole('option', { name: 'Cherry' }).length).toBe(1)

    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowDown}')
    await el.updateComplete
    const activeId = input.element().getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(el.shadowRoot?.querySelector(`#${activeId}`)?.textContent?.trim()).toBe('Cherry')
    expect(page.getByRole('option', { name: 'Cherry' }).length).toBe(1)

    const banana = panel.querySelector<WebUiOption>('web-ui-option[value="banana"]')!
    banana.remove()
    const apple = panel.querySelector<WebUiOption>('web-ui-option[value="apple"]')!
    el.append(apple)
    await waitForFrame()
    await el.updateComplete

    const visualValues = [...panel.querySelectorAll<WebUiOption>('web-ui-option')].map(option => option.value)
    expect(visualValues).toEqual(['cherry', 'apple'])
    expect(page.getByRole('option', { name: 'Banana' }).length).toBe(0)
    expect(page.getByRole('option', { name: 'Cherry' }).length).toBe(1)

    el.value = 'Cherry'
    await el.updateComplete
    expect(el.selectedValue).toBe('cherry')
    expect(page.getByRole('option', { name: 'Cherry' }).element().getAttribute('aria-selected')).toBe('true')

    const idsBeforeClose = [...panel.querySelectorAll<WebUiOption>('web-ui-option')].map(option => [
      option.value,
      option.id
    ])
    await userEvent.keyboard('{Escape}')
    expect(page.getByRole('listbox').length).toBe(0)
    await new Promise(resolve => setTimeout(resolve, 300))
    expect([...el.querySelectorAll<WebUiOption>('web-ui-option')].map(option => option.value)).toEqual([
      'cherry',
      'apple'
    ])

    await userEvent.keyboard('{ArrowDown}')
    expect(page.getByRole('listbox').length).toBe(1)
    const reopenedPanel = getPortalPanel(theme)!
    expect([...reopenedPanel.querySelectorAll<WebUiOption>('web-ui-option')].map(option => option.value)).toEqual([
      'cherry',
      'apple'
    ])
    expect(
      [...reopenedPanel.querySelectorAll<WebUiOption>('web-ui-option')].map(option => [option.value, option.id])
    ).toEqual(idsBeforeClose)

    const late = document.createElement('web-ui-option')
    late.value = 'date'
    late.label = 'Date'
    el.append(late)
    await userEvent.keyboard('{Escape}')
    await new Promise(resolve => setTimeout(resolve, 300))
    expect([...el.querySelectorAll<WebUiOption>('web-ui-option')].map(option => option.value)).toEqual([
      'cherry',
      'apple',
      'date'
    ])
  })

  it('Portal empty state 的真实 pointer 点击保持打开，外部 pointer 点击关闭，option 仍可选择', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    const el = document.createElement('web-ui-autocomplete')
    el.portal = true
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    theme.append(el)
    document.body.append(theme)
    await theme.updateComplete
    await el.updateComplete

    const input = page.getByRole('combobox')
    input.element().focus()
    await waitForFrame()
    await waitForFrame()
    await el.updateComplete
    expect(page.getByRole('listbox').length).toBe(1)
    await input.fill('zzz')
    await el.updateComplete

    const panel = getPortalPanel(theme)!
    const empty = panel.querySelector<HTMLElement>('.autocomplete-empty')!
    await page.elementLocator(empty).click()
    expect(el.open).toBe(true)

    const outside = document.createElement('button')
    outside.textContent = 'outside'
    outside.style.cssText = 'position:fixed; inset:0 auto auto 0; width:120px; height:40px; z-index:9999;'
    document.body.append(outside)
    await page.elementLocator(outside).click()
    expect(page.getByRole('listbox').length).toBe(0)
    expect(el.open).toBe(false)

    input.element().focus()
    await waitForFrame()
    await waitForFrame()
    expect(page.getByRole('listbox').length).toBe(1)
    await input.fill('')
    await el.updateComplete
    const option = getPortalPanel(theme)!.querySelector<HTMLElement>('web-ui-option')!
    await page.elementLocator(option).click()
    expect(el.value).toBe('Apple')
    expect(el.selectedValue).toBe('apple')
    expect(el.open).toBe(false)
  })

  it('浏览器中的 focus/blur 事件在宿主 retarget 且保持 composed contract', async () => {
    const el = document.createElement('web-ui-autocomplete')
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    document.body.append(el)
    await el.updateComplete

    const events: Array<{
      type: string
      focusEvent: boolean
      composed: boolean
      target: EventTarget | null
      currentTarget: EventTarget | null
    }> = []
    el.addEventListener('focus', event =>
      events.push({
        type: event.type,
        focusEvent: event instanceof FocusEvent,
        composed: event.composed,
        target: event.target,
        currentTarget: event.currentTarget
      })
    )
    el.addEventListener('blur', event =>
      events.push({
        type: event.type,
        focusEvent: event instanceof FocusEvent,
        composed: event.composed,
        target: event.target,
        currentTarget: event.currentTarget
      })
    )

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!
    input.focus()
    input.blur()

    expect(events.map(event => event.type)).toEqual(['focus', 'blur'])
    expect(events.every(event => event.focusEvent && event.composed)).toBe(true)
    expect(events.every(event => event.target === el && event.currentTarget === el)).toBe(true)
  })

  it('form state restore 同步 input、selected-value、FormData 与 required validity', async () => {
    const form = document.createElement('form')
    const el = document.createElement('web-ui-autocomplete')
    el.name = 'city'
    el.required = true
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    form.append(el)
    document.body.append(form)
    await el.updateComplete

    el.formStateRestoreCallback('Apple')
    await el.updateComplete

    expect(el.value).toBe('Apple')
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!.value).toBe('Apple')
    expect(el.selectedValue).toBe('apple')
    expect(el.getAttribute('selected-value')).toBe('apple')
    expect(new FormData(form).get('city')).toBe('Apple')
    expect(form.checkValidity()).toBe(true)
  })

  it('focused input 所在 fieldset 禁用时关闭 autocomplete 并释放 scroll lock', async () => {
    const fieldset = document.createElement('fieldset')
    const el = document.createElement('web-ui-autocomplete')
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    fieldset.append(el)
    document.body.append(fieldset)
    await el.updateComplete

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!
    input.focus()
    await el.updateComplete
    fieldset.disabled = true
    await el.updateComplete

    expect(el.open).toBe(false)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(input.getAttribute('aria-activedescendant')).toBeFalsy()
    expect(document.body.style.position).toBe('')
  })

  it('非 focused 但 open 的 autocomplete 在 fieldset 禁用时也关闭', async () => {
    const fieldset = document.createElement('fieldset')
    const el = document.createElement('web-ui-autocomplete')
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    fieldset.append(el)
    document.body.append(fieldset)
    await el.updateComplete

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    await el.updateComplete
    expect(el.open).toBe(true)

    fieldset.disabled = true
    await el.updateComplete
    expect(el.open).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!.getAttribute('aria-expanded')).toBe(
      'false'
    )
  })

  it('Portal open 时 fieldset 禁用会关闭、restore 内容并释放 scroll lock', async () => {
    const fieldset = document.createElement('fieldset')
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    const el = document.createElement('web-ui-autocomplete')
    el.portal = true
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    fieldset.append(el)
    theme.append(fieldset)
    document.body.append(theme)
    await theme.updateComplete
    await el.updateComplete

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    await waitForFrame()
    expect(el.open).toBe(true)

    fieldset.disabled = true
    await el.updateComplete
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(getPortalPanel(theme)).toBeNull()
    expect(el.open).toBe(false)
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(input.getAttribute('aria-activedescendant')).toBeFalsy()
    expect(document.body.style.position).toBe('')
    expect(el.querySelector('web-ui-option')).toBeTruthy()
  })

  it('非 portal：位于 shadow root 内水平偏移的定位祖先时，面板仍与输入框对齐', async () => {
    // 回归：autocomplete 缺少本地 position:relative 包裹层（对比 select 的 .wui-select-inner）时，
    // 绝对定位面板的包含块会落到远端定位祖先（如 web-ui-layout 的 sticky header），
    // 而 Floating UI 按 offsetParent（BODY）计算坐标，导致水平偏移。
    // 复刻 web-ui-layout：组件作为 light DOM 内容 slot 进 shadow root 内一个
    // 水平偏移的定位祖先。offsetParent 计算不会跨 shadow 边界取到该祖先（落到 BODY），
    // 而绝对定位面板的实际包含块却是它——两者不一致时面板就会水平偏移。
    const host = document.createElement('div')
    host.style.marginTop = '40px'
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML =
      '<div style="position: absolute; left: 120px; top: 0; isolation: isolate; padding: 12px; display: inline-block;"><slot></slot></div>'
    document.body.append(host)

    const el = document.createElement('web-ui-autocomplete')
    el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
    host.append(el)
    await el.updateComplete

    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[role="combobox"]')!
    input.focus()
    await el.updateComplete
    await waitForFrame()
    await el.updateComplete

    const panel = el.shadowRoot!.querySelector<HTMLElement>('.autocomplete-overlay')!
    const wrapper = el.shadowRoot!.querySelector<HTMLElement>('.input-wrapper')!
    const panelRect = panel.getBoundingClientRect()
    const wrapperRect = wrapper.getBoundingClientRect()

    expect(el.open).toBe(true)
    // bottom-start：面板左边缘应与锚点（input-wrapper）左边缘对齐（offset 4 只影响纵向）
    expect(Math.abs(panelRect.left - wrapperRect.left)).toBeLessThan(2)
    // 面板纵向位于输入框下方
    expect(panelRect.top).toBeGreaterThanOrEqual(wrapperRect.bottom - 1)
  })
})
