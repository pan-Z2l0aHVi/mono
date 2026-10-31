import '@/assets/global.css'
import '@/generated/examples.css'

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { Changelog } from '../components/changelog'

afterEach(() => {
  cleanup()
  window.scrollTo(0, 0)
})

describe('更新日志页（浏览器）', () => {
  it('在真实浏览器里使用示例页的 Markdown 间距并在底部自动加载', async () => {
    const { container } = render(<Changelog />)

    expect(container.textContent).toContain('12.0.1')
    expect(container.querySelectorAll('.mdc-heading').length).toBeGreaterThan(0)
    expect(container.textContent).not.toContain('# @greypan/web-ui')
    expect(container.querySelectorAll('[data-changelog-version]').length).toBeGreaterThanOrEqual(8)

    const section = container.querySelector<HTMLElement>('[data-changelog-version]')
    if (!section) throw new Error('changelog version not found')
    expect(getComputedStyle(section).rowGap).toBe('16px')
    expect(getComputedStyle(section).contentVisibility).toBe('auto')

    window.scrollTo(0, document.documentElement.scrollHeight)
    await vi.waitFor(() => {
      expect(container.querySelectorAll('[data-changelog-version]').length).toBeGreaterThan(8)
    })
  })
})
