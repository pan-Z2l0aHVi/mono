import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

const toastMock = vi.hoisted(() => ({
  clear: vi.fn<() => void>(),
  close: vi.fn<(id: string) => void>(),
  info: vi.fn<(message: string, options?: { id?: string }) => string>(),
  updateMessage: vi.fn<(id: string, options: { message: string }) => void>()
}))

vi.mock('@greypan/web-ui', () => ({ toast: toastMock }))

import ToastDemo from '../index.vue'

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllTimers()
  toastMock.clear.mockClear()
  toastMock.close.mockClear()
  toastMock.info.mockReset()
  toastMock.updateMessage.mockClear()
})

describe('ToastDemo', () => {
  it('重复启动倒计时时分别更新每个 toast', async () => {
    vi.useFakeTimers()
    const wrapper = mount(ToastDemo)
    const countdownButton = wrapper.findAll('web-ui-button').find(button => button.text() === '10 秒倒计时更新')

    await countdownButton?.trigger('click')
    await countdownButton?.trigger('click')

    const firstId = toastMock.info.mock.calls[0][1]?.id
    const secondId = toastMock.info.mock.calls[1][1]?.id

    expect(firstId).toBeDefined()
    expect(secondId).toBeDefined()
    expect(secondId).not.toBe(firstId)
    expect(toastMock.close).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)

    expect(toastMock.updateMessage).toHaveBeenCalledWith(firstId, { message: '将在 9 秒后自动关闭' })
    expect(toastMock.updateMessage).toHaveBeenCalledWith(secondId, { message: '将在 9 秒后自动关闭' })
    wrapper.unmount()
  })
})
