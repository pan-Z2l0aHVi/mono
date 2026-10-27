// @vitest-environment jsdom

import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { cleanupElement, flushSlotChange, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDialog } from '..'

afterEach(() => document.body.replaceChildren())

function createDialog(initialHTML = ''): WebUiDialog {
  const el = document.createElement('web-ui-dialog')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

/*
 * accessible name 的接线（与 drawer 同形）：
 * - 显式 aria-dialog-label 优先，直接写原生 dialog 的 aria-label；
 * - 否则非 headless 且带可见时，aria-labelledby 指向带（id="wui-dialog-heading"）；
 * - headless 没有可自动关联的内置标题，两个属性都不写——名字由 Consumer 负责。
 * 判据读的是原生 <dialog> 上的 attribute，不是内部 id，后者是接线细节。
 */
describe('WebUiDialog accessible name', () => {
  function nativeDialog(el: WebUiDialog): HTMLDialogElement {
    return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
  }

  it('非 headless 且有可命名的带时，aria-labelledby 指向带', async () => {
    const el = createDialog('<span slot="header">设置</span>')
    await flushSlotChange(el)

    expect(nativeDialog(el).getAttribute('aria-labelledby')).toBe('wui-dialog-heading')
    expect(nativeDialog(el).hasAttribute('aria-label')).toBe(false)
    cleanupElement(el)
  })

  it('heading 属性 fallback 时同样接线', async () => {
    const el = createDialog('<p>正文</p>')
    el.heading = '设置'
    await waitForUpdate(el)

    expect(nativeDialog(el).getAttribute('aria-labelledby')).toBe('wui-dialog-heading')
    cleanupElement(el)
  })

  it('带为空且无 heading 时不接线，不指向隐藏的带', async () => {
    const el = createDialog('<p>正文</p>')
    await waitForUpdate(el)

    expect(nativeDialog(el).hasAttribute('aria-labelledby')).toBe(false)
    expect(nativeDialog(el).hasAttribute('aria-label')).toBe(false)
    cleanupElement(el)
  })

  it('heading 清空后 accessible name 随带一起消失', async () => {
    const el = createDialog('<p>正文</p>')
    el.heading = '设置'
    await waitForUpdate(el)
    expect(nativeDialog(el).getAttribute('aria-labelledby')).toBe('wui-dialog-heading')

    // 带随 heading 一起退场，名字不能还挂在一个已经不存在的带。
    el.heading = ''
    await waitForUpdate(el)

    expect(nativeDialog(el).hasAttribute('aria-labelledby')).toBe(false)
    expect(nativeDialog(el).hasAttribute('aria-label')).toBe(false)
    cleanupElement(el)
  })

  it('aria-dialog-label 优先于带，直接写 aria-label', async () => {
    const el = createDialog('<span slot="header">设置</span>')
    el.ariaDialogLabel = '设置'
    await flushSlotChange(el)

    expect(nativeDialog(el).getAttribute('aria-label')).toBe('设置')
    expect(nativeDialog(el).hasAttribute('aria-labelledby')).toBe(false)
    cleanupElement(el)
  })

  // dialog-label 自 11.1.0 发布，是保留的 deprecated 别名（见 ADR-0029）：
  // attribute 写入仍要落到原生 <dialog> 的 aria-label，防止别名静默失效。
  it('旧名 dialog-label 作为 deprecated 别名仍生效', async () => {
    const el = createDialog('<span slot="header">设置</span>')
    el.setAttribute('dialog-label', '设置')
    await waitForUpdate(el)

    expect(nativeDialog(el).getAttribute('aria-label')).toBe('设置')
    expect(nativeDialog(el).hasAttribute('aria-labelledby')).toBe(false)
    cleanupElement(el)
  })

  it('headless 不接线：没有可自动关联的内置标题，名字留给 Consumer', async () => {
    const el = createDialog('<section>自定义主体</section>')
    el.headless = true
    el.heading = '设置'
    await waitForUpdate(el)

    expect(nativeDialog(el).hasAttribute('aria-labelledby')).toBe(false)
    expect(nativeDialog(el).hasAttribute('aria-label')).toBe(false)
    cleanupElement(el)
  })

  it('headless 下 Consumer 仍可用 aria-dialog-label 提供名字', async () => {
    const el = createDialog('<section>自定义主体</section>')
    el.headless = true
    el.ariaDialogLabel = '自定义主体'
    await waitForUpdate(el)

    expect(nativeDialog(el).getAttribute('aria-label')).toBe('自定义主体')
    cleanupElement(el)
  })

  it('运行时移除槽内容后，heading 接管并被重新接线', async () => {
    const el = createDialog('<span slot="header">槽标题</span>')
    el.heading = '属性标题'
    await flushSlotChange(el)

    el.querySelector('[slot="header"]')!.remove()
    await flushSlotChange(el)

    // 槽空后带由 heading 填充：带重新成为可命名的对象。带里读到的是哪段文字由浏览器
    // 的槽分发决定（jsdom 不排版），渲染面在同目录的 header.browser.spec.ts 取证。
    expect(nativeDialog(el).getAttribute('aria-labelledby')).toBe('wui-dialog-heading')
    cleanupElement(el)
  })
})
