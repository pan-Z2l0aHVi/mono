import '..'
import '@/components/radio'

import { afterEach, expect, it } from 'vite-plus/test'

import type { WebUiRadio } from '@/components/radio'
import { mountElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiCheckbox } from '..'

afterEach(() => document.body.replaceChildren())

it('外框尺寸改变时对勾和圆点按比例变化，内部图形可以独立覆盖', async () => {
  const checkbox = mountElement<WebUiCheckbox>('web-ui-checkbox', { attrs: { checked: '' } })
  const radio = mountElement<WebUiRadio>('web-ui-radio', { attrs: { checked: '' } })
  checkbox.style.setProperty('--wui-selection-control-size', '30px')
  radio.style.setProperty('--wui-selection-control-size', '30px')
  await Promise.all([waitForUpdate(checkbox), waitForUpdate(radio)])
  const icon = checkbox.shadowRoot!.querySelector('web-ui-icon')!
  await icon.updateComplete
  const svg = icon.shadowRoot!.querySelector('svg')!
  const dot = radio.shadowRoot!.querySelector<HTMLElement>('.wui-radio-dot')!
  expect(svg.getBoundingClientRect().width).toBe(30)
  expect(dot.offsetWidth).toBe(10)
  checkbox.style.setProperty('--wui-checkbox-icon-size', '20px')
  radio.style.setProperty('--wui-radio-dot-size', '8px')
  expect(svg.getBoundingClientRect().width).toBe(20)
  expect(dot.offsetWidth).toBe(8)
  expect(checkbox.shadowRoot!.querySelector('.wui-checkbox-box')!.getBoundingClientRect().width).toBe(30)
  expect(radio.shadowRoot!.querySelector('.wui-radio-circle')!.getBoundingClientRect().width).toBe(30)
})
