import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import PopoverDemo from '../index.vue'

describe('PopoverDemo', () => {
  it('展示 Portal Popover', () => {
    const wrapper = mount(PopoverDemo)
    const popovers = wrapper.findAll('web-ui-popover')

    expect(popovers.some(({ element }) => (element as HTMLElement & { portal: boolean }).portal)).toBe(true)

    wrapper.unmount()
  })

  it('不再展示模态 Popover', () => {
    const wrapper = mount(PopoverDemo)

    expect(wrapper.findAll('web-ui-popover').every(({ element }) => !element.hasAttribute('modal'))).toBe(true)
    wrapper.unmount()
  })
})
