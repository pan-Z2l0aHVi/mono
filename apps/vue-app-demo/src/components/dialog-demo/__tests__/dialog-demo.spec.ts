import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import DialogDemo from '../index.vue'

describe('DialogDemo', () => {
  it('展示关闭滚动锁定的对话框', () => {
    const wrapper = mount(DialogDemo)

    expect(wrapper.html()).toContain('lock-scroll="false"')
    wrapper.unmount()
  })

  it('包含不可点击遮罩关闭选项', () => {
    const wrapper = mount(DialogDemo)

    expect(wrapper.html()).toContain('overlay-closable="false"')
    wrapper.unmount()
  })

  it('包含自定义 body slot 对话框', () => {
    const wrapper = mount(DialogDemo)

    expect(wrapper.html()).toContain('slot="body"')
    expect(wrapper.html()).toContain('操作成功')
    wrapper.unmount()
  })
})
