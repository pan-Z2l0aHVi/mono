import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import SelectDemo from '../index.vue'

describe('SelectDemo', () => {
  it('展示 Portal Select', () => {
    const wrapper = mount(SelectDemo)
    const selects = wrapper.findAll('web-ui-select')

    expect(selects.some(({ element }) => (element as HTMLElement & { portal: boolean }).portal)).toBe(true)

    wrapper.unmount()
  })

  it('展示关闭滚动锁定的 Select', () => {
    const wrapper = mount(SelectDemo)

    expect(wrapper.html()).toContain('lock-scroll="false"')
    wrapper.unmount()
  })
})
