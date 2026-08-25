import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/input'
import type { WebUiInput } from '@/components/input'
import { queryA11y, waitForUpdate } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

// 通过 web-ui-input 驱动 shared/form-association 的原生表单生命周期。
// jsdom 不触发 form-associated custom element 的 FormData/reset 回调，
// 提交与 reset 语义由 __tests__/form-association.browser.spec.ts 覆盖；
// 此处聚焦 jsdom 可观察的属性/状态语义（声明式初始化/restore/disabled）。
describe('shared/form-association（jsdom 契约）', () => {
  it('声明式 value 属性作为初始默认值', async () => {
    const form = document.createElement('form')
    const input = document.createElement('web-ui-input') as WebUiInput
    input.setAttribute('value', 'initial')
    form.append(input)
    document.body.append(form)
    await waitForUpdate(input)

    expect(input.value).toBe('initial')
  })

  it('restoreState 应用外部恢复的状态', async () => {
    const form = document.createElement('form')
    const input = document.createElement('web-ui-input') as WebUiInput
    form.append(input)
    document.body.append(form)
    await waitForUpdate(input)

    input.formStateRestoreCallback('restored')
    await waitForUpdate(input)
    expect(input.value).toBe('restored')
  })

  it('formDisabledCallback 禁用后控件反映禁用态', async () => {
    const form = document.createElement('form')
    const input = document.createElement('web-ui-input') as WebUiInput
    form.append(input)
    document.body.append(form)
    await waitForUpdate(input)

    input.formDisabledCallback(true)
    await waitForUpdate(input)
    expect((queryA11y(input, 'input') as HTMLInputElement).disabled).toBe(true)

    input.formDisabledCallback(false)
    await waitForUpdate(input)
    expect((queryA11y(input, 'input') as HTMLInputElement).disabled).toBe(false)
  })
})
