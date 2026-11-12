import '..'
import '@/components/toast'

import { afterEach, expect, it } from 'vite-plus/test'

import { toast } from '@/components/toast'
import { pollUntil } from '@/shared/test-utils'

afterEach(() => {
  toast._reset()
  document.body.replaceChildren()
})

it('弹窗中显示 toast 不改变弹窗的位置和尺寸', async () => {
  const component = document.createElement('web-ui-dialog')
  component.textContent = '内容'
  document.body.append(component)
  component.open = true
  await component.updateComplete
  const dialog = component.shadowRoot!.querySelector('dialog')!
  await pollUntil(() => getComputedStyle(dialog).transform === 'matrix(1, 0, 0, 1, 0, 0)', 'dialog not settled')
  const before = dialog.getBoundingClientRect()
  toast.warning('提示', { container: dialog, duration: 0 })
  await pollUntil(() => !!dialog.querySelector('web-ui-toast'), 'toast not mounted')
  const after = dialog.getBoundingClientRect()
  for (const key of ['x', 'y', 'width', 'height'] as const) expect(after[key]).toBeCloseTo(before[key], 1)
  expect(getComputedStyle(dialog.querySelector('.wui-toast-container')!).position).toBe('fixed')
})
