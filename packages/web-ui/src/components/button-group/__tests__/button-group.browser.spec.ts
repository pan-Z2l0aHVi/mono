import { afterEach, describe, expect, it } from 'vite-plus/test'

import { mountElement, waitForUpdate } from '@/shared/test-utils'
import '@/components/button'

import '..'
import type { WebUiButtonGroup } from '..'
import type { WebUiButton } from '../../button'

const PAIR = '<web-ui-button>A</web-ui-button><web-ui-button>B</web-ui-button>'

async function mountDividerPair(options: { direction?: 'horizontal' | 'vertical'; length?: string }) {
  const group = mountElement<WebUiButtonGroup>('web-ui-button-group', { html: PAIR })
  if (options.direction) group.direction = options.direction
  if (options.length) group.style.setProperty('--wui-button-group-divider-length', options.length)
  await waitForUpdate(group)

  const buttons = group.querySelectorAll<WebUiButton>('web-ui-button')
  await Promise.all([...buttons].map(button => button.updateComplete))

  return buttons
}

const mountDividerGroup = async (options: { direction?: 'horizontal' | 'vertical'; length?: string } = {}) =>
  (await mountDividerPair(options))[0].shadowRoot!.querySelector<HTMLElement>('.group-divider')!

afterEach(() => {
  document.body.replaceChildren()
})

describe('WebUiButtonGroup 分割线（浏览器）', () => {
  it('未设置 token 时横排分割线保持 1px × 24px', async () => {
    const divider = await mountDividerGroup({})
    const style = getComputedStyle(divider)

    expect(style.width).toBe('1px')
    expect(style.height).toBe('24px')
  })

  it('未设置 token 时竖排分割线保持 24px × 1px', async () => {
    const divider = await mountDividerGroup({ direction: 'vertical' })
    const style = getComputedStyle(divider)

    expect(style.width).toBe('24px')
    expect(style.height).toBe('1px')
  })

  it('token 只缩短长边，横排不改粗细', async () => {
    const divider = await mountDividerGroup({ length: '16px' })
    const style = getComputedStyle(divider)

    expect(style.width).toBe('1px')
    expect(style.height).toBe('16px')
  })

  it('竖排时长边落在 width 上，同一 token 生效', async () => {
    const divider = await mountDividerGroup({ direction: 'vertical', length: '16px' })
    const style = getComputedStyle(divider)

    expect(style.width).toBe('16px')
    expect(style.height).toBe('1px')
  })

  it('末位子按钮不渲染分割线', async () => {
    const buttons = await mountDividerPair({})

    expect(buttons[0].shadowRoot!.querySelector('.group-divider')).toBeTruthy()
    expect(buttons[1].shadowRoot!.querySelector('.group-divider')).toBeNull()
  })
})
