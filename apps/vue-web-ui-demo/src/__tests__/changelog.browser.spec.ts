import '@/assets/global.css'
import '@/generated/examples.css'

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import Changelog from '../pages/changelog.vue'

let wrapper: VueWrapper | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  window.scrollTo(0, 0)
})

describe('更新日志页（浏览器）', () => {
  it('在真实浏览器里使用示例页的 Markdown 间距并在底部自动加载', async () => {
    wrapper = mount(Changelog, { attachTo: document.body })
    const text = wrapper.text()

    expect(text).toContain('12.0.1')
    expect(wrapper.findAll('.mdc-heading').length).toBeGreaterThan(0)
    expect(text).not.toContain('# @greypan/web-ui')
    expect(wrapper.findAll('[data-changelog-version]').length).toBeGreaterThanOrEqual(8)

    const section = wrapper.find('[data-changelog-version]').element as HTMLElement
    expect(getComputedStyle(section).rowGap).toBe('16px')
    expect(getComputedStyle(section).contentVisibility).toBe('auto')

    window.scrollTo(0, document.documentElement.scrollHeight)
    await vi.waitFor(() => {
      expect(wrapper!.findAll('[data-changelog-version]').length).toBeGreaterThan(8)
    })
  })
})
