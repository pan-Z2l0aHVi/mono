import '..'
import '@/components/dialog'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiDialog } from '@/components/dialog'
import { waitForUpdate } from '@/shared/test-utils'

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

describe('内置无障碍文案（浏览器）', () => {
  it('未设置覆盖时回退内置英文，不随文档 lang 变化', async () => {
    document.documentElement.lang = 'zh-CN'
    const input = await mountInput()
    expect(clearButton(input).getAttribute('aria-label')).toBe('Clear')

    const dialog = document.createElement('web-ui-dialog') as WebUiDialog
    dialog.closable = true
    document.body.append(dialog)
    await waitForUpdate(dialog)
    const close = dialog.shadowRoot?.querySelector('web-ui-button.wui-dialog-close')
    expect(close?.getAttribute('aria-label')).toBe('Close')
  })

  it('aria-clear-label 覆盖内置英文', async () => {
    const input = await mountInput()
    input.setAttribute('aria-clear-label', '清空输入')
    await waitForUpdate(input)
    expect(clearButton(input).getAttribute('aria-label')).toBe('清空输入')
  })
})
