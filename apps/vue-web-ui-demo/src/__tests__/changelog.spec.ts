import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import Changelog from '../pages/changelog.vue'

describe('更新日志页', () => {
  it('从 CHANGELOG.md 原样渲染整份文档', () => {
    const wrapper = mount(Changelog)

    expect(wrapper.find('h1').text()).toBe('@greypan/web-ui')
    // 版本号来自 CHANGELOG.md，会随发版变化：这里只校验形状，不写死具体版本。
    expect(wrapper.find('h2').text()).toMatch(/^\d+\.\d+\.\d+$/)
    expect(wrapper.findAll('.mdm-heading').length).toBeGreaterThan(0)
    // 围栏代码块来自 CHANGELOG.md，渲染成 codeblock 卡片。
    expect(wrapper.findAll('[data-codeblock]').length).toBeGreaterThan(0)
    expect(wrapper.html()).not.toContain('# @greypan/web-ui')
  })
})
