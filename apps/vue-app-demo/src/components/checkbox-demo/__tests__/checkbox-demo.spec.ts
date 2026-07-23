import type { WebUiCheckboxGroup } from '@greypan/web-ui/components/checkbox-group'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import { nextTick } from 'vue'
import '@greypan/web-ui/components/checkbox'
import '@greypan/web-ui/components/checkbox-group'

import CheckboxDemo from '../index.vue'

describe('CheckboxDemo', () => {
  it('初始 group 值会呈现为子选项的选中状态', async () => {
    const wrapper = mount(CheckboxDemo, { attachTo: document.body })
    await nextTick()
    await new Promise(process.nextTick)

    const group = wrapper.findAll('web-ui-checkbox-group')[0].element as WebUiCheckboxGroup
    await group.updateComplete
    expect(group.value).toEqual(['banana', 'cherry'])

    const checkboxes = group.querySelectorAll('web-ui-checkbox')
    await Promise.all([...checkboxes].map(checkbox => checkbox.updateComplete))

    expect(checkboxes[0].checked).toBe(false)
    expect(checkboxes[1].checked).toBe(true)
    expect(checkboxes[2].checked).toBe(true)

    expect(checkboxes[0].shadowRoot!.querySelector('label')!.classList.contains('is-checked')).toBe(false)
    expect(checkboxes[1].shadowRoot!.querySelector('label')!.classList.contains('is-checked')).toBe(true)
    expect(checkboxes[2].shadowRoot!.querySelector('label')!.classList.contains('is-checked')).toBe(true)

    wrapper.unmount()
  })

  it('基本用法点击选项后更新选中值', async () => {
    const wrapper = mount(CheckboxDemo, { attachTo: document.body })
    const checkbox = wrapper.findAll('web-ui-checkbox')[0].element
    await checkbox.updateComplete
    const label = checkbox.shadowRoot!.querySelector('label') as HTMLElement

    label.click()
    await nextTick()
    await new Promise(process.nextTick)

    expect(wrapper.findAll('p')[0].text()).toBe('选中值：[\n  "apple"\n]')

    wrapper.unmount()
  })
})
