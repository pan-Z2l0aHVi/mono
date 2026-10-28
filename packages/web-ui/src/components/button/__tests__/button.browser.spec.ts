import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { resetPointerFocusState } from '@/shared/focus/pointer-focus'
import { flush, mountElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiButton } from '..'

function luminance(color: string): number {
  const channels = color
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number)
  if (!channels || channels.length !== 3) throw new Error(`Expected an rgb color, received ${color}`)
  const [red, green, blue] = channels.map(channel => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

afterEach(() => {
  document.body.replaceChildren()
  resetPointerFocusState()
})

describe('WebUiButton 组件（浏览器）', () => {
  it('接受裸 px 数值与带单位的 CSS 长度，并保持 icon button 正方形', async () => {
    const numeric = mountElement<WebUiButton>('web-ui-button', { attrs: { size: '32' } })
    const decimal = mountElement<WebUiButton>('web-ui-button', { attrs: { size: '.5' } })
    const fractionalPixels = mountElement<WebUiButton>('web-ui-button', { attrs: { size: '.5px' } })
    const trailingDecimal = mountElement<WebUiButton>('web-ui-button', { attrs: { size: '32.' } })
    const pixels = mountElement<WebUiButton>('web-ui-button', { attrs: { size: '32px' } })
    const rem = mountElement<WebUiButton>('web-ui-button', { attrs: { size: '1.5rem' } })
    const icon = mountElement<WebUiButton>('web-ui-button', {
      attrs: { size: '32px', icon: '', 'aria-label': 'Icon button' }
    })

    await Promise.all([numeric, decimal, fractionalPixels, trailingDecimal, pixels, rem, icon].map(waitForUpdate))

    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    expect(rootFontSize, '前置：rem 档的期望值来自根字号').toBeGreaterThan(0)

    // 裸数值按 px 处理：与显式 px 档互等，不写死像素值。
    expect(numeric.getBoundingClientRect().height).toBe(pixels.getBoundingClientRect().height)
    expect(decimal.getBoundingClientRect().height).toBe(fractionalPixels.getBoundingClientRect().height)
    expect(trailingDecimal.getBoundingClientRect().height).toBe(pixels.getBoundingClientRect().height)
    expect(rem.getBoundingClientRect().height).toBeCloseTo(rootFontSize * 1.5, 1)
    expect(icon.getBoundingClientRect().width).toBe(pixels.getBoundingClientRect().width)
    expect(icon.getBoundingClientRect().height).toBe(pixels.getBoundingClientRect().height)
  })

  it('size 通过数字属性赋值时仍按 px 更新', async () => {
    const button = mountElement<WebUiButton>('web-ui-button')
    const pixels = mountElement<WebUiButton>('web-ui-button', { attrs: { size: '32px' } })
    ;(button as unknown as { size: unknown }).size = 32

    await Promise.all([waitForUpdate(button), waitForUpdate(pixels)])

    expect(button.getBoundingClientRect().height).toBe(pixels.getBoundingClientRect().height)
  })

  it('数字 size 为 0 时仍按 0px 处理', async () => {
    const button = mountElement<WebUiButton>('web-ui-button')
    ;(button as unknown as { size: unknown }).size = 0

    await waitForUpdate(button)

    expect(button.getBoundingClientRect().height).toBe(0)
  })

  it('移除 size 属性后恢复默认高度', async () => {
    const button = mountElement<WebUiButton>('web-ui-button', { attrs: { size: '32' } })
    const defaults = mountElement<WebUiButton>('web-ui-button')
    await Promise.all([waitForUpdate(button), waitForUpdate(defaults)])
    expect(button.getBoundingClientRect().height).not.toBe(defaults.getBoundingClientRect().height)

    button.removeAttribute('size')
    await waitForUpdate(button)

    // 默认高度是视觉常量，不写死数字：与从未设置 size 的实例互等。
    expect(button.getBoundingClientRect().height).toBe(defaults.getBoundingClientRect().height)
    expect(button.getBoundingClientRect().height).toBeGreaterThan(0)
  })

  it('dark primary 的文字与 accent 背景达到 WCAG AA', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'dark')
    theme.setAttribute('motion', 'reduced')
    const button = document.createElement('web-ui-button') as WebUiButton
    button.variant = 'primary'
    button.textContent = 'Primary'
    theme.append(button)
    document.body.append(theme)
    await waitForUpdate(theme)
    await waitForUpdate(button)

    const inner = button.shadowRoot?.querySelector('button')
    expect(inner).toBeTruthy()
    const styles = getComputedStyle(inner!)
    expect(contrastRatio(styles.color, styles.backgroundColor)).toBeGreaterThanOrEqual(4.5)
  })

  it('将规范化后的 type 传给真实原生 button', async () => {
    const button = mountElement<WebUiButton>('web-ui-button', { attrs: { type: 'invalid' } })
    await waitForUpdate(button)

    const inner = button.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(inner).toBeTruthy()
    expect(button.type).toBe('button')
    expect(inner?.type).toBe('button')

    button.type = 'reset'
    await waitForUpdate(button)
    expect(inner?.type).toBe('reset')
  })

  it('submit 和 reset 通过宿主 form owner 驱动 Shadow DOM 外的祖先表单', async () => {
    const form = document.createElement('form')
    const input = document.createElement('input')
    input.name = 'name'
    input.defaultValue = 'initial'
    input.value = 'changed'
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    const resetButton = document.createElement('web-ui-button')
    resetButton.type = 'reset'
    form.append(input, submitButton, resetButton)
    document.body.append(form)
    await Promise.all([waitForUpdate(submitButton), waitForUpdate(resetButton)])

    const submitEvents: SubmitEvent[] = []
    let resetEvents = 0
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents.push(event)
    })
    form.addEventListener('reset', () => {
      resetEvents += 1
    })

    const innerSubmit = submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    const innerReset = resetButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(innerSubmit?.form).toBeNull()
    expect(innerReset?.form).toBeNull()

    innerSubmit?.click()
    await flush()
    expect(submitEvents).toHaveLength(1)
    expect(submitEvents[0]?.submitter).toBeNull()
    expect([...new FormData(form).keys()]).toEqual(['name'])
    expect(input.value).toBe('changed')

    innerReset?.click()
    await flush()
    expect(resetEvents).toBe(1)
    expect(input.value).toBe('initial')
  })

  it('disabled 阻止 submit 和 reset，并把原生 button 移出 tab 序列', async () => {
    const form = document.createElement('form')
    const input = document.createElement('input')
    input.defaultValue = 'initial'
    input.value = 'changed'
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    submitButton.disabled = true
    const resetButton = document.createElement('web-ui-button')
    resetButton.type = 'reset'
    resetButton.disabled = true
    form.append(input, submitButton, resetButton)
    document.body.append(form)
    await Promise.all([waitForUpdate(submitButton), waitForUpdate(resetButton)])

    let submitEvents = 0
    let resetEvents = 0
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents += 1
    })
    form.addEventListener('reset', () => {
      resetEvents += 1
    })

    const innerSubmit = submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    const innerReset = resetButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(innerSubmit?.disabled).toBe(true)
    expect(innerReset?.disabled).toBe(true)

    innerSubmit?.focus()
    expect(submitButton.shadowRoot?.activeElement).not.toBe(innerSubmit)
    innerSubmit?.click()
    innerReset?.click()
    await flush()

    expect(submitEvents).toBe(0)
    expect(resetEvents).toBe(0)
    expect(input.value).toBe('changed')
  })

  it('原生 input 按 Enter 恰好通过 type=submit 宿主触发一次隐式提交', async () => {
    const form = document.createElement('form')
    const input = document.createElement('input')
    input.name = 'name'
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    form.append(input, submitButton)
    document.body.append(form)
    await waitForUpdate(submitButton)

    let submitEvents = 0
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents += 1
    })

    input.focus()
    expect(document.activeElement).toBe(input)
    await userEvent.keyboard('{Enter}')
    await flush()

    expect(submitEvents).toBe(1)
  })

  it('type=submit/reset 没有 form owner 时不产生表单动作', async () => {
    const surface = document.createElement('div')
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    const resetButton = document.createElement('web-ui-button')
    resetButton.type = 'reset'
    surface.append(submitButton, resetButton)
    document.body.append(surface)
    await Promise.all([waitForUpdate(submitButton), waitForUpdate(resetButton)])

    const innerSubmit = submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    const innerReset = resetButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(innerSubmit?.form).toBeNull()
    expect(innerReset?.form).toBeNull()

    let submitEvents = 0
    let resetEvents = 0
    surface.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents += 1
    })
    surface.addEventListener('reset', () => {
      resetEvents += 1
    })

    innerSubmit?.click()
    innerReset?.click()
    await flush()

    expect(submitEvents).toBe(0)
    expect(resetEvents).toBe(0)
  })

  it('宿主 click 被 preventDefault 时取消转发的 submit', async () => {
    const form = document.createElement('form')
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    form.append(submitButton)
    document.body.append(form)
    await waitForUpdate(submitButton)

    let submitEvents = 0
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents += 1
    })
    submitButton.addEventListener('click', event => event.preventDefault())

    submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')?.click()
    await flush()

    expect(submitEvents).toBe(0)
  })

  it('宿主 click 被 preventDefault 时取消转发的 reset', async () => {
    const form = document.createElement('form')
    const input = document.createElement('input')
    input.name = 'name'
    input.defaultValue = 'initial'
    input.value = 'changed'
    const resetButton = document.createElement('web-ui-button')
    resetButton.type = 'reset'
    form.append(input, resetButton)
    document.body.append(form)
    await waitForUpdate(resetButton)

    let resetEvents = 0
    form.addEventListener('reset', () => {
      resetEvents += 1
    })
    resetButton.addEventListener('click', event => event.preventDefault())

    resetButton.shadowRoot?.querySelector<HTMLButtonElement>('button')?.click()
    await flush()

    expect(resetEvents).toBe(0)
    expect(input.value).toBe('changed')
  })

  it('祖先 fieldset 禁用时不转发 submit，重新启用后恢复', async () => {
    const form = document.createElement('form')
    const fieldset = document.createElement('fieldset')
    fieldset.disabled = true
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    fieldset.append(submitButton)
    form.append(fieldset)
    document.body.append(form)
    await waitForUpdate(submitButton)

    let submitEvents = 0
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents += 1
    })

    const inner = submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(submitButton.hasAttribute('disabled')).toBe(false)
    expect(inner?.disabled).toBe(true)
    inner?.click()
    await flush()
    expect(submitEvents).toBe(0)

    fieldset.disabled = false
    await waitForUpdate(submitButton)
    expect(inner?.disabled).toBe(false)
    inner?.click()
    await flush()
    expect(submitEvents).toBe(1)
  })

  it('宿主 disabled 解除后真实 button 立即恢复可点', async () => {
    const button = mountElement<WebUiButton>('web-ui-button', { attrs: { disabled: '' } })
    let clicks = 0
    button.addEventListener('click', () => {
      clicks += 1
    })
    await waitForUpdate(button)

    const inner = button.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(inner?.disabled).toBe(true)

    button.disabled = false
    await waitForUpdate(button)
    await flush()

    expect(inner?.disabled).toBe(false)
    await userEvent.click(button)
    expect(clicks).toBe(1)
  })

  it('宿主 disabled 置为 true 后真实 button 立即不可点', async () => {
    const button = mountElement<WebUiButton>('web-ui-button')
    let clicks = 0
    button.addEventListener('click', () => {
      clicks += 1
    })
    await waitForUpdate(button)

    button.disabled = true
    await waitForUpdate(button)
    await flush()

    expect(button.shadowRoot?.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true)
    await userEvent.click(button)
    expect(clicks).toBe(0)
  })

  it('icon + loading 只渲染 spinner，且不可点击、不可聚焦', async () => {
    const btn = mountElement<WebUiButton>('web-ui-button', {
      attrs: { icon: '', size: '32', loading: '', 'aria-label': 'test' },
      html: '<web-ui-icon data-role="mine"></web-ui-icon>'
    })
    await waitForUpdate(btn)

    const inner = btn.shadowRoot?.querySelector<HTMLButtonElement>('button') as HTMLButtonElement
    // spinner 替换 icon 内容：shadow 内唯一的 web-ui-icon 是 spinner，默认 slot 不渲染
    expect(btn.shadowRoot!.querySelectorAll('web-ui-icon')).toHaveLength(1)
    expect(btn.shadowRoot!.querySelector('slot:not([name])')).toBeNull()

    expect(inner.disabled).toBe(true)
    inner.focus()
    expect(document.activeElement).not.toBe(inner)
  })

  it('键盘导航清掉指针聚焦标记，focus ring 恢复绘制', async () => {
    const btn = mountElement<WebUiButton>('web-ui-button')
    btn.textContent = 'Open'
    await waitForUpdate(btn)

    const inner = btn.shadowRoot?.querySelector('button') as HTMLButtonElement
    expect(inner).toBeTruthy()

    await userEvent.click(btn)
    await waitForUpdate(btn)

    /*
     * Chromium 在指针点击后不会让 `:focus-visible` 命中（helper 正是为会命中的引擎存在的），
     * 所以「环被压掉」在这一端没有可观察面，可观察的是下一句：键盘导航清掉标记后环画出来。
     * 这句前置不是契约本身，是控制组——标记压根没写上时，第二半句也会绿。
     */
    expect(btn.hasAttribute('data-wui-pointer-focus'), '前置：真实指针点击后 helper 应已打上标记').toBe(true)

    await userEvent.keyboard('{ArrowUp}')
    await waitForUpdate(btn)

    expect(inner.matches(':focus-visible'), '前置：键盘输入后 inner 应进入 :focus-visible').toBe(true)
    const outline = getComputedStyle(inner)
    expect(outline.outlineStyle, '键盘导航后环要画出来').not.toBe('none')
    expect(outline.outlineColor, '标记没被清掉时 ring 颜色仍是透明的').not.toBe('rgba(0, 0, 0, 0)')
  })
})
