import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vite-plus/test'

const toastMock = vi.hoisted(() => ({
  info: vi.fn<() => string>()
}))

vi.mock('@greypan/web-ui', () => ({ toast: toastMock }))

import ThemeDemo from '../index.vue'

type ThemeElement = HTMLElement & { appearance: string; motion: string }
type SegmentedElement = HTMLElement & { value: string }

function themes(wrapper: ReturnType<typeof mountThemeDemo>): ThemeElement[] {
  return wrapper.findAll('web-ui-theme').map(theme => theme.element as ThemeElement)
}

function mountThemeDemo() {
  return mount(ThemeDemo)
}

describe('ThemeDemo', () => {
  it('展示单层与嵌套主题的 motion 默认值', () => {
    const wrapper = mountThemeDemo()
    const [single, outer, inner, innermost] = themes(wrapper)

    expect(single.motion).toBe('system')
    expect(outer.motion).toBe('reduced')
    expect(inner.motion).toBe('full')
    expect(innermost.motion).toBe('system')

    wrapper.unmount()
  })

  it('可切换单层主题的 motion', async () => {
    const wrapper = mountThemeDemo()
    const segmented = wrapper.findAll('web-ui-segmented')[1]
    ;(segmented.element as SegmentedElement).value = 'reduced'

    await segmented.trigger('input')

    expect(themes(wrapper)[0].motion).toBe('reduced')

    wrapper.unmount()
  })

  it('可分别覆盖内层与最内层主题的 motion', async () => {
    const wrapper = mountThemeDemo()
    const segmented = wrapper.findAll('web-ui-segmented')
    ;(segmented[4].element as SegmentedElement).value = 'reduced'
    await segmented[4].trigger('input')
    ;(segmented[5].element as SegmentedElement).value = 'full'
    await segmented[5].trigger('input')

    const [, , inner, innermost] = themes(wrapper)
    expect(inner.motion).toBe('reduced')
    expect(innermost.motion).toBe('full')

    wrapper.unmount()
  })

  it('可分别切换内层与最内层主题的 appearance', async () => {
    const wrapper = mountThemeDemo()
    const segmented = wrapper.findAll('web-ui-segmented')
    ;(segmented[2].element as SegmentedElement).value = 'light'
    await segmented[2].trigger('input')
    ;(segmented[3].element as SegmentedElement).value = 'dark'
    await segmented[3].trigger('input')

    const [, , inner, innermost] = themes(wrapper)
    expect(inner.appearance).toBe('light')
    expect(innermost.appearance).toBe('dark')

    wrapper.unmount()
  })

  it('可切换单层主题的 appearance', async () => {
    const wrapper = mountThemeDemo()
    const segmented = wrapper.findAll('web-ui-segmented')[0]
    ;(segmented.element as SegmentedElement).value = 'dark'

    await segmented.trigger('input')

    expect(themes(wrapper)[0].appearance).toBe('dark')

    wrapper.unmount()
  })

  it('展示继承主题范围的 Select、Toast 与 Dialog', async () => {
    const wrapper = mountThemeDemo()
    const select = wrapper.find("web-ui-select[aria-label='主题范围 Portal Select']")
    const toastButton = wrapper.findAll('web-ui-button').find(button => button.text() === '显示 Toast')
    const dialogButton = wrapper.findAll('web-ui-button').find(button => button.text() === '打开 Dialog')
    const dialog = wrapper.find('web-ui-dialog')

    expect((select.element as HTMLElement & { portal: boolean }).portal).toBe(true)

    await toastButton?.trigger('click')
    expect(toastMock.info).toHaveBeenCalledWith(
      'Toast 会挂载到当前 theme scope 的 overlay root。',
      expect.objectContaining({ target: toastButton?.element })
    )

    await dialogButton?.trigger('click')
    expect((dialog.element as HTMLElement & { open: boolean }).open).toBe(true)

    wrapper.unmount()
  })
})
