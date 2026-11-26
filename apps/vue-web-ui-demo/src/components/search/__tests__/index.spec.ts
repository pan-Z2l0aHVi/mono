import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import Search from '../index.vue'

async function flushMicrotasks() {
  await nextTick()
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}

describe('Vue Search 组件', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('首次以 open=true 挂载时同步模板元素并聚焦输入框，且输入后可渲染匹配结果', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/components/:component', component: { template: '<div />' } }
      ]
    })
    await router.push('/')
    await router.isReady()

    const controls = document.createElement('div')
    document.body.append(controls)

    const wrapper = mount(Search, {
      attachTo: controls,
      props: { open: true, controls },
      global: { plugins: [router] }
    })

    const inputEl = wrapper.element.querySelector('web-ui-input') as HTMLElement | null
    expect(inputEl).not.toBeNull()
    const focusSpy = vi.spyOn(inputEl!, 'focus')

    // 首次挂载后 post-flush / microtask 期间应触发输入框聚焦。
    await flushMicrotasks()
    expect(focusSpy).toHaveBeenCalledTimes(1)

    // 触发输入后应渲染对应组件结果链接。
    Object.defineProperty(inputEl!, 'value', { value: 'button', writable: true, configurable: true })
    inputEl!.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    const links = wrapper.element.querySelectorAll('a[href="/components/button"]')
    expect(links.length).toBeGreaterThan(0)

    wrapper.unmount()
  })
})
