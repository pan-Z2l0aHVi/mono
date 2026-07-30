import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import DrawerDemo from '../index.vue'

describe('DrawerDemo', () => {
  it('展示关闭滚动锁定的抽屉', () => {
    const wrapper = mount(DrawerDemo)

    expect(wrapper.html()).toContain('lock-scroll="false"')
    wrapper.unmount()
  })

  it('展示不可点击遮罩关闭的抽屉', () => {
    const wrapper = mount(DrawerDemo)

    expect(wrapper.html()).toContain('overlay-closable="false"')
    wrapper.unmount()
  })
})
