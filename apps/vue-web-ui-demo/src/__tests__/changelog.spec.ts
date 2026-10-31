import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'

import Changelog from '../pages/changelog.vue'

let intersect: ((entries: IntersectionObserverEntry[]) => void) | undefined

afterEach(() => {
  vi.unstubAllGlobals()
  intersect = undefined
})

describe('更新日志页', () => {
  it('从 CHANGELOG.md 分页渲染版本，并在底部自动加载下一批', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        root = null
        rootMargin = ''
        thresholds = []
        constructor(callback: IntersectionObserverCallback) {
          intersect = entries => callback(entries, this as unknown as IntersectionObserver)
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return []
        }
      }
    )

    const wrapper = mount(Changelog)
    const html = wrapper.html()

    expect(wrapper.find('h1').exists()).toBe(true)
    expect(wrapper.find('.wui-glass').exists()).toBe(false)
    expect(html).toContain('12.0.1')
    expect(html).toContain('mdc-heading')
    expect(html).not.toContain('# @greypan/web-ui')
    expect(wrapper.findAll('[data-changelog-version]')).toHaveLength(8)

    await nextTick()
    intersect?.([{ isIntersecting: true } as IntersectionObserverEntry])
    await nextTick()
    await nextTick()

    expect(wrapper.findAll('[data-changelog-version]')).toHaveLength(16)
  })
})
