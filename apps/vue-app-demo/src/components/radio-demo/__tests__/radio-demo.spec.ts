import type { WebUiRadioGroup } from '@greypan/web-ui/components/radio-group'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import { nextTick } from 'vue'
import '@greypan/web-ui/components/radio'
import '@greypan/web-ui/components/radio-group'

import RadioDemo from '../index.vue'

describe('RadioDemo', () => {
  it('初始 group 值会呈现为子选项的选中状态', async () => {
    const wrapper = mount(RadioDemo, { attachTo: document.body })
    await nextTick()
    await new Promise(process.nextTick)

    const group = wrapper.findAll('web-ui-radio-group')[0].element as WebUiRadioGroup
    await group.updateComplete
    expect(group.value).toBe('banana')

    const radios = group.querySelectorAll('web-ui-radio')
    await Promise.all([...radios].map(radio => radio.updateComplete))

    expect(radios[0].checked).toBe(false)
    expect(radios[1].checked).toBe(true)
    expect(radios[2].checked).toBe(false)

    expect(radios[0].shadowRoot!.querySelector('label')!.classList.contains('is-checked')).toBe(false)
    expect(radios[1].shadowRoot!.querySelector('label')!.classList.contains('is-checked')).toBe(true)
    expect(radios[2].shadowRoot!.querySelector('label')!.classList.contains('is-checked')).toBe(false)

    wrapper.unmount()
  })

  it('基本用法点击选项后更新选中值', async () => {
    const wrapper = mount(RadioDemo, { attachTo: document.body })
    const radio = wrapper.findAll('web-ui-radio')[1].element
    await radio.updateComplete
    const label = radio.shadowRoot!.querySelector('label') as HTMLElement

    label.click()
    await nextTick()
    await new Promise(process.nextTick)

    expect(wrapper.findAll('p')[0].text()).toBe('选中值：banana')

    wrapper.unmount()
  })
})
