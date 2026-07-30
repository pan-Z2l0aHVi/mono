import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import DropdownDemo from '../index.vue'

describe('DropdownDemo', () => {
  it('展示关闭滚动锁定的下拉菜单', () => {
    const wrapper = mount(DropdownDemo)

    expect(wrapper.html()).toContain('lock-scroll="false"')
    wrapper.unmount()
  })
})
