import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'

import TooltipDemo from '../index.vue'

describe('TooltipDemo', () => {
  it('展示 Portal Tooltip', () => {
    const wrapper = mount(TooltipDemo)
    const tooltips = wrapper.findAll('web-ui-tooltip')

    expect(tooltips.some(({ element }) => (element as HTMLElement & { portal: boolean }).portal)).toBe(true)

    wrapper.unmount()
  })
})
