import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiInput } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiInput 表单关联（浏览器）', () => {
  it('使用声明式 value 同步渲染与 FormData', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-input name="title" value="foo"></web-ui-input>'
    document.body.append(form)

    const input = form.querySelector('web-ui-input')!
    await input.updateComplete

    expect(input.value).toBe('foo')
    expect(new FormData(form).get('title')).toBe('foo')
  })

  it('readonly 空值不阻塞提交（barred from validation）', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-input name="title" required readonly></web-ui-input>'
    document.body.append(form)

    const input = form.querySelector('web-ui-input')!
    await input.updateComplete

    expect(form.checkValidity()).toBe(true)
  })

  it('disabled 空值不阻塞提交（barred from validation）', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-input name="title" required disabled></web-ui-input>'
    document.body.append(form)

    const input = form.querySelector('web-ui-input')!
    await input.updateComplete

    expect(form.checkValidity()).toBe(true)
    expect(input.matches(':invalid')).toBe(false)
  })

  it('fieldset disabled 窗口内不上报约束 flags', async () => {
    // form.checkValidity() 对 barred（disabled）元素不聚合错误状态，窗口期写入的
    // flags 只能通过 spy setValidity 直接观测。
    const reported: ValidityStateFlags[] = []
    const original = ElementInternals.prototype.setValidity
    ElementInternals.prototype.setValidity = function (
      flags?: ValidityStateFlags,
      message?: string,
      anchor?: HTMLElement
    ) {
      reported.push({ ...flags })
      return original.call(this, flags, message, anchor)
    }

    try {
      const form = document.createElement('form')
      form.innerHTML = '<fieldset><web-ui-input name="title" required></web-ui-input></fieldset>'
      document.body.append(form)

      const input = form.querySelector('web-ui-input')!
      await input.updateComplete
      expect(form.checkValidity()).toBe(false)

      reported.length = 0
      // formDisabledCallback 经 sync 在原生 input 的 disabled 属性重渲染前触发；
      // 此窗口内不得把 valueMissing 写入 internals。
      form.querySelector('fieldset')!.disabled = true
      await input.updateComplete
      expect(reported.some(flags => flags.valueMissing)).toBe(false)
      expect(form.checkValidity()).toBe(true)
      expect(input.matches(':invalid')).toBe(false)
    } finally {
      ElementInternals.prototype.setValidity = original
    }
  })
})
