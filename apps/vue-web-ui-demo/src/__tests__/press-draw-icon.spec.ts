import '@greypan/web-ui/components/button'
import '@greypan/web-ui/components/icon'
import '@greypan/web-ui/components/svg-draw-lines'

import type { WebUiIcon, WebUiSvgDrawLines } from '@greypan/web-ui'
import { akarIconsCircleCheck, lucideCopy } from '@greypan/web-ui/icons'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent, h, ref } from 'vue'

import PressDrawIcon from '@/components/PressDrawIcon.vue'

describe('PressDrawIcon', () => {
  it('点击同步切换图标后在下一帧对新图标触发 replay，快速连点也会重播', async () => {
    const Host = defineComponent({
      setup() {
        const copied = ref(false)
        return () =>
          h('web-ui-button', { onClick: () => (copied.value = true) }, [
            h(PressDrawIcon, null, () => h('web-ui-icon', { icon: copied.value ? akarIconsCircleCheck : lucideCopy }))
          ])
      }
    })

    const wrapper = mount(Host, { attachTo: document.body })
    const lines = (wrapper.element as HTMLElement).querySelector('web-ui-svg-draw-lines') as WebUiSvgDrawLines
    const replayedIcons: unknown[] = []
    const replaySpy = vi.spyOn(lines, 'replay').mockImplementation(async () => {
      replayedIcons.push(lines.querySelector<WebUiIcon>('web-ui-icon')?.icon)
    })

    await wrapper.find('web-ui-button').trigger('click')
    await vi.waitFor(() => expect(replaySpy).toHaveBeenCalledTimes(1))
    expect(replayedIcons[0]).toBe(akarIconsCircleCheck)

    // 已处于对勾状态时再次快速点击，仍触发一次 replay
    await wrapper.find('web-ui-button').trigger('click')
    await vi.waitFor(() => expect(replaySpy).toHaveBeenCalledTimes(2))
    expect(replayedIcons[1]).toBe(akarIconsCircleCheck)

    wrapper.unmount()
  })
})
