import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import { nextTick } from 'vue'

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

  it('接收 input 事件后更新 v-model 状态', async () => {
    const wrapper = mount(SelectDemo)
    const select = wrapper.findAll('web-ui-select')[1].element as HTMLElement & { value: string }

    select.value = 'react'
    select.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await nextTick()

    expect(wrapper.text()).toContain('选中值：react')

    wrapper.unmount()
  })

  it('接收 change 事件后更新事件示例的状态', async () => {
    const wrapper = mount(SelectDemo)
    const select = wrapper.findAll('web-ui-select')[2].element as HTMLElement & { value: string }

    select.value = 'b'
    select.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    await nextTick()

    expect(wrapper.text()).toContain('selected：b')

    wrapper.unmount()
  })
})
