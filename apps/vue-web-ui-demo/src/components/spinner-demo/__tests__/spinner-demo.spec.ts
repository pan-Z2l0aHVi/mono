import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import SpinnerDemo from '../index.vue'

describe('SpinnerDemo', () => {
  it('展示自定义尺寸按钮', () => {
    const wrapper = mount(SpinnerDemo)

    expect(wrapper.html()).toContain('小尺寸 (16)')
    expect(wrapper.html()).toContain('大尺寸 (64)')
    wrapper.unmount()
  })

  it('展示描述文字按钮和声明式 slot', () => {
    const wrapper = mount(SpinnerDemo)

    expect(wrapper.html()).toContain('带描述')
    expect(wrapper.html()).toContain('长描述 (10s)')
    expect(wrapper.html()).toContain('slot="description"')
    wrapper.unmount()
  })
})
