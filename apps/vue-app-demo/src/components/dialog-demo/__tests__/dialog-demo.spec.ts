import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import DialogDemo from '../index.vue'

describe('DialogDemo', () => {
  it('展示关闭滚动锁定的对话框', () => {
    const wrapper = mount(DialogDemo)

    expect(wrapper.html()).toContain('lock-scroll="false"')
    wrapper.unmount()
  })
})
