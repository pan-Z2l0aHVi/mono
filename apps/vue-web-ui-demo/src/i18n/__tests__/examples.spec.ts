import { flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vite-plus/test'
import { createApp, defineComponent, h, nextTick, ref, type Component } from 'vue'

import { createDemo } from '../examples'

it.each([false, true])('预加载=%s，示例完成加载后重渲染保留状态', async preload => {
  const Counter = defineComponent({
    setup() {
      const count = ref(0)
      return () => h('button', { onClick: () => count.value++ }, String(count.value))
    }
  })
  const entry = createDemo(async () => ({ default: Counter }))
  if (preload) await entry.load()
  const revision = ref(0)
  const app = createApp({ render: () => h(entry.get(), { revision: revision.value }) })
  const root = document.createElement('div')
  app.mount(root)
  try {
    expect(root.querySelector('button')?.textContent ?? null).toBe(preload ? '0' : null)
    await flushPromises()
    const button = root.querySelector('button')!
    button.click()
    await nextTick()
    expect(button.textContent).toBe('1')
    revision.value++
    await nextTick()
    expect(root.querySelector('button')).toBe(button)
    expect(button.textContent).toBe('1')
  } finally {
    app.unmount()
  }
})

it('下载失败后可重新准备示例，成功结果继续缓存', async () => {
  const module = { default: defineComponent({ render: () => h('button', 'Ready') }) }
  const load = vi
    .fn<() => Promise<{ default: Component }>>()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue(module)
  const entry = createDemo(load)
  await expect(entry.load()).rejects.toThrow('Offline')
  await expect(entry.load()).resolves.toBe(module)
  await expect(entry.load()).resolves.toBe(module)
  expect(load).toHaveBeenCalledTimes(2)
})
