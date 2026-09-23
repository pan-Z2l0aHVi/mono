import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
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

  it('clearable 有值时清除按钮派发一次 input 并把 value 置空', async () => {
    const el = createInput()
    el.clearable = true
    el.value = 'hello'
    await waitForUpdate(el)

    const events: Event[] = []
    el.addEventListener('input', e => events.push(e))

    const clear = queryA11y(el, '[aria-label="清除"]')
    expect(clear).toBeTruthy()
    ;(clear as HTMLElement).click()

    expect(events).toHaveLength(1)
    expect(el.value).toBe('')
    cleanupElement(el)
  })

  it('readonly 时不渲染清除按钮', async () => {
    const el = createInput()
    el.clearable = true
    el.readonly = true
    el.value = 'hello'
    await waitForUpdate(el)
    expect(queryA11y(el, '[aria-label="清除"]')).toBeNull()
    cleanupElement(el)
  })

  it('clearable 无值时也不渲染清除按钮', async () => {
    const el = createInput()
    el.clearable = true
    await waitForUpdate(el)
    expect(queryA11y(el, '[aria-label="清除"]')).toBeNull()
    cleanupElement(el)
  })
})
