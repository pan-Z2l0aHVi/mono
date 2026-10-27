import '..'
import '@/components/dialog'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiDialog } from '@/components/dialog'
import { waitForFrame, waitForUpdate } from '@/shared/test-utils'

import type { WebUiInput } from '..'

const initialLang = document.documentElement.lang

afterEach(() => {
  document.documentElement.lang = initialLang
  document.body.replaceChildren()
})

async function mountInput(): Promise<WebUiInput> {
  const input = document.createElement('web-ui-input') as WebUiInput
  input.clearable = true
  input.value = 'text'
  document.body.append(input)
  await waitForUpdate(input)
  return input
}

function clearButton(input: WebUiInput): HTMLElement {
  const button = input.shadowRoot?.querySelector<HTMLElement>('web-ui-button')
  expect(button).toBeTruthy()
  return button!
}

describe('内置无障碍文案跟随语言（浏览器）', () => {
  it('中文文档下 input 清除按钮与 dialog 关闭按钮输出中文', async () => {
    document.documentElement.lang = 'zh-CN'
    const input = await mountInput()
    expect(clearButton(input).getAttribute('aria-label')).toBe('清除')

    const dialog = document.createElement('web-ui-dialog') as WebUiDialog
    dialog.closable = true
    document.body.append(dialog)
    await waitForUpdate(dialog)
    const close = dialog.shadowRoot?.querySelector('web-ui-button.wui-dialog-close')
    expect(close?.getAttribute('aria-label')).toBe('关闭')
  })

  it('文档语言运行期切换后重渲染', async () => {
    document.documentElement.lang = 'en'
    const input = await mountInput()
    expect(clearButton(input).getAttribute('aria-label')).toBe('Clear')

    document.documentElement.lang = 'zh-CN'
    await waitForFrame()
    await waitForUpdate(input)
    expect(clearButton(input).getAttribute('aria-label')).toBe('清除')
  })

  it('显式 clear-label 覆盖语言默认值', async () => {
    document.documentElement.lang = 'zh-CN'
    const input = await mountInput()
    input.setAttribute('clear-label', '清空输入')
    await waitForUpdate(input)
    expect(clearButton(input).getAttribute('aria-label')).toBe('清空输入')
  })
})
