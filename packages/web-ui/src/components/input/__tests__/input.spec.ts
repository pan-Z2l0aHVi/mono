import '..'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { cleanupElement, mountElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiInput } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 共有契约（value/disabled 默认值、属性反射、input・change・focus・blur 事件、
 * value 双向同步、formAssociated）见
 * `src/shared/form-association/__tests__/text-control-contract.spec.ts`；
 * 命名 slot 的分配数量见同目录 `named-slot-presence.spec.ts`。
 * 本文件只保留 input 特有的公开契约。
 */
const createInput = (attrs?: Record<string, string>): WebUiInput => mountElement<WebUiInput>('web-ui-input', { attrs })
const nativeInput = (el: WebUiInput): HTMLInputElement => queryA11y(el, 'input') as HTMLInputElement

describe('WebUiInput 组件特有契约', () => {
  it('type 默认 text', async () => {
    const el = createInput()
    await waitForUpdate(el)
    expect(el.type).toBe('text')
    cleanupElement(el)
  })

  it('aria-label 映射到内部输入元素', async () => {
    const el = createInput({ 'aria-label': 'Search' })
    await waitForUpdate(el)
    expect(nativeInput(el).getAttribute('aria-label')).toBe('Search')
    cleanupElement(el)
  })

  it('disabled 时点击容器不聚焦原生 input', async () => {
    const el = createInput()
    el.disabled = true
    await waitForUpdate(el)

    const input = nativeInput(el)
    const spy = vi.spyOn(input, 'focus')
    // 原生 input 的直接父容器即点击区域，用结构关系而非内部 class 定位
    input.parentElement!.click()

    expect(spy).not.toHaveBeenCalled()
    cleanupElement(el)
  })

  // 公共 focus()/blur() 与 textarea 对齐：宿主自身无 tab 位（不可聚焦），
  // 不重定向到内部原生控件的话调用方拿到的是一次空操作
  it('focus() 聚焦原生 input', async () => {
    const el = createInput()
    await waitForUpdate(el)

    el.focus()
    await waitForUpdate(el)

    expect(document.activeElement).toBe(el)
    expect(nativeInput(el)).toBe(el.shadowRoot?.activeElement)
    expect(el.hasAttribute('focused')).toBe(true)

    cleanupElement(el)
  })

  it('blur() 移焦原生 input', async () => {
    const el = createInput()
    await waitForUpdate(el)

    el.focus()
    await waitForUpdate(el)
    expect(el.hasAttribute('focused')).toBe(true)

    el.blur()
    await waitForUpdate(el)

    expect(el.shadowRoot?.activeElement).toBeNull()
    expect(el.hasAttribute('focused')).toBe(false)

    cleanupElement(el)
  })

  it('select() 委托原生 input 全选当前值', async () => {
    const el = createInput({ value: 'hello' })
    await waitForUpdate(el)

    const native = nativeInput(el)
    const spy = vi.spyOn(native, 'select')
    el.select()

    expect(spy).toHaveBeenCalledTimes(1)
    cleanupElement(el)
  })

  it('disabled 时 select() 与 focus() 一样安全 no-op', async () => {
    const el = createInput({ value: 'hello' })
    el.disabled = true
    await waitForUpdate(el)

    const native = nativeInput(el)
    const selectSpy = vi.spyOn(native, 'select')
    const focusSpy = vi.spyOn(native, 'focus')
    el.select()
    el.focus()

    expect(selectSpy).not.toHaveBeenCalled()
    expect(focusSpy).not.toHaveBeenCalled()
    expect(el.shadowRoot?.activeElement).toBeNull()
    cleanupElement(el)
  })

  it('原生 input 未渲染时 select() 不抛错', () => {
    const el = document.createElement('web-ui-input') as WebUiInput
    expect(() => el.select()).not.toThrow()
  })

  it('clearable 有值时清除 button 派发一次 input 并把 value 置空', async () => {
    const el = createInput()
    el.clearable = true
    el.value = 'hello'
    await waitForUpdate(el)

    const events: Event[] = []
    el.addEventListener('input', e => events.push(e))

    const clear = queryA11y(el, '[aria-label="Clear"]')
    expect(clear).toBeTruthy()
    ;(clear as HTMLElement).click()

    expect(events).toHaveLength(1)
    expect(el.value).toBe('')
    cleanupElement(el)
  })

  it('readonly 时不渲染清除 button', async () => {
    const el = createInput()
    el.clearable = true
    el.readonly = true
    el.value = 'hello'
    await waitForUpdate(el)
    expect(queryA11y(el, '[aria-label="Clear"]')).toBeNull()
    cleanupElement(el)
  })

  it('disabled 时不渲染清除 button', async () => {
    const el = createInput()
    el.clearable = true
    el.disabled = true
    el.value = 'hello'
    await waitForUpdate(el)

    expect(queryA11y(el, '[aria-label="Clear"]')).toBeNull()
    cleanupElement(el)
  })

  it('clearable 无值时也不渲染清除 button', async () => {
    const el = createInput()
    el.clearable = true
    await waitForUpdate(el)
    expect(queryA11y(el, '[aria-label="Clear"]')).toBeNull()
    cleanupElement(el)
  })

  /**
   * 清除是一次「已提交」的离散变更，不是连续输入：只派发 input 会让
   * `v-model.lazy` 这类只监听 change 的消费者永远收不到清空。
   */
  it('点击清除 button 同时派发 input 与 change', async () => {
    const el = createInput()
    el.clearable = true
    el.value = 'hello'
    await waitForUpdate(el)

    const events: string[] = []
    el.addEventListener('input', () => events.push('input'))
    el.addEventListener('change', () => events.push('change'))

    const clear = queryA11y(el, '[aria-label="Clear"]') as HTMLElement
    expect(clear, '应有清除 button').toBeTruthy()
    clear.click()
    await waitForUpdate(el)

    expect(el.value).toBe('')
    expect(events).toEqual(['input', 'change'])
    cleanupElement(el)
  })

  it('清除后失焦不再重复派发 change', async () => {
    const el = createInput()
    el.clearable = true
    el.value = 'hello'
    await waitForUpdate(el)

    const events: string[] = []
    el.addEventListener('change', () => events.push('change'))

    ;(queryA11y(el, '[aria-label="Clear"]') as HTMLElement).click()
    await waitForUpdate(el)
    nativeInput(el).dispatchEvent(new FocusEvent('blur'))
    await waitForUpdate(el)

    expect(events).toEqual(['change'])
    cleanupElement(el)
  })
})
