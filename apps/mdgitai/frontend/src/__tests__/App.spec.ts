import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from '../App.vue'

describe('App 挂载测试', () => {
  it('组件应当成功渲染到 DOM', () => {
    const wrapper = mount(App)

    expect(wrapper.exists()).toBe(true)

    expect(wrapper.element).not.toBeNull()
  })
})
