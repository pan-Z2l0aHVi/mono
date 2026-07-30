import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import ContextMenuDemo from '../index.vue'

describe('ContextMenuDemo', () => {
  it('展示关闭滚动锁定的右键菜单', () => {
    const wrapper = mount(ContextMenuDemo)

    expect(wrapper.html()).toContain('lock-scroll="false"')
    wrapper.unmount()
  })
})
