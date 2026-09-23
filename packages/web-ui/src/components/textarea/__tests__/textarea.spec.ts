import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, mountElement, queryA11y, waitForUpdate } from '@/shared/test-utils'

import type { WebUiTextarea } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 共有契约（value/disabled 默认值、属性反射、input・change・focus・blur 事件、
 * value 双向同步、formAssociated）见
 * `src/shared/form-association/__tests__/text-control-contract.spec.ts`；
 * 命名 slot 的分配数量见同目录 `named-slot-presence.spec.ts`。
 * 本文件只保留 textarea 特有的公开契约。
 */
const createTextarea = (attrs?: Record<string, string>): WebUiTextarea =>
  mountElement<WebUiTextarea>('web-ui-textarea', { attrs })

const nativeTextarea = (el: WebUiTextarea): HTMLTextAreaElement => queryA11y(el, 'textarea') as HTMLTextAreaElement

describe('WebUiTextarea 组件特有契约', () => {
  it('rows 默认 3', async () => {
    const el = createTextarea()
    await waitForUpdate(el)
    expect(nativeTextarea(el).rows).toBe(3)
    cleanupElement(el)
  })

  it('disabled 时点击容器不聚焦原生 textarea', async () => {
    const el = createTextarea()
    el.disabled = true
    await waitForUpdate(el)

    const textarea = nativeTextarea(el)
    const spy = vi.spyOn(textarea, 'focus')
    // 原生 textarea 的直接父容器即点击区域，用结构关系而非内部 class 定位
    textarea.parentElement!.click()

    expect(spy).not.toHaveBeenCalled()
    cleanupElement(el)
  })

  it('focus() 聚焦原生 textarea', async () => {
    const el = createTextarea()
    await waitForUpdate(el)

    const spy = vi.spyOn(nativeTextarea(el), 'focus')
    el.focus()
    expect(spy).toHaveBeenCalled()
    cleanupElement(el)
  })

  it('blur() 移焦原生 textarea', async () => {
    const el = createTextarea()
    await waitForUpdate(el)

    const spy = vi.spyOn(nativeTextarea(el), 'blur')
    el.blur()
    expect(spy).toHaveBeenCalled()
    cleanupElement(el)
  })

  it('select() 委托原生 textarea 全选当前值', async () => {
    const el = createTextarea({ value: 'hello' })
    await waitForUpdate(el)

    const native = nativeTextarea(el)
    const spy = vi.spyOn(native, 'select')
    el.select()

    expect(spy).toHaveBeenCalledTimes(1)
    cleanupElement(el)
  })

  it('disabled 时 select() 与 focus() 一样安全 no-op', async () => {
    const el = createTextarea({ value: 'hello' })
    el.disabled = true
    await waitForUpdate(el)

    const native = nativeTextarea(el)
    const selectSpy = vi.spyOn(native, 'select')
    const focusSpy = vi.spyOn(native, 'focus')
    el.select()
    el.focus()

    expect(selectSpy).not.toHaveBeenCalled()
    expect(focusSpy).not.toHaveBeenCalled()
    expect(el.shadowRoot?.activeElement).toBeNull()
    cleanupElement(el)
  })

  it('原生 textarea 未渲染时 select() 不抛错', () => {
    const el = document.createElement('web-ui-textarea') as WebUiTextarea
    expect(() => el.select()).not.toThrow()
  })

  it('将 aria-label 转发给原生 textarea', async () => {
    const el = createTextarea({ 'aria-label': '个人简介' })
    await waitForUpdate(el)
    expect(nativeTextarea(el).getAttribute('aria-label')).toBe('个人简介')
    cleanupElement(el)
  })

  it('将 aria-labelledby 转发给原生 textarea', async () => {
    const el = createTextarea({ 'aria-labelledby': 'bio-label' })
    await waitForUpdate(el)
    expect(nativeTextarea(el).getAttribute('aria-labelledby')).toBe('bio-label')
    cleanupElement(el)
  })

  it('clearable 有值时清除按钮派发一次 input 并把 value 置空', async () => {
    const el = createTextarea()
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
    const el = createTextarea()
    el.clearable = true
    el.readonly = true
    el.value = 'hello'
    await waitForUpdate(el)
    expect(queryA11y(el, '[aria-label="清除"]')).toBeNull()
    cleanupElement(el)
  })

  it('clearable 无值时也不渲染清除按钮', async () => {
    const el = createTextarea()
    el.clearable = true
    await waitForUpdate(el)
    expect(queryA11y(el, '[aria-label="清除"]')).toBeNull()
    cleanupElement(el)
  })
})
