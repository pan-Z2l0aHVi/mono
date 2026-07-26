import { local } from '@greypan/browser-kit/storage'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createRouter, createWebHistory } from 'vue-router'

import App from '@/app/index.vue'

const STORAGE_KEY = 'theme-appearance'

const router = createRouter({
  history: createWebHistory(),
  routes: []
})

function getThemeAppearance(wrapper: ReturnType<typeof mountApp>): string {
  return (wrapper.find('web-ui-theme').element as HTMLElement & { appearance: string }).appearance
}

function getThemeSelectValue(wrapper: ReturnType<typeof mountApp>): string {
  return (wrapper.find('web-ui-select').element as HTMLElement & { value: string }).value
}

function mountApp() {
  return mount(App, {
    global: {
      plugins: [router],
      stubs: {
        RouterView: true,
        RouterLink: true
      }
    }
  })
}

afterEach(() => {
  local.remove(STORAGE_KEY)
})

describe('App 挂载测试', () => {
  it('组件应当成功渲染到 DOM', () => {
    const wrapper = mountApp()

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.element).not.toBeNull()

    wrapper.unmount()
  })

  it('没有持久化的主题时使用浅色', () => {
    const wrapper = mountApp()

    expect(getThemeAppearance(wrapper)).toBe('light')

    wrapper.unmount()
  })

  it('恢复持久化的主题', () => {
    local.set(STORAGE_KEY, 'dark')

    const wrapper = mountApp()

    expect(getThemeAppearance(wrapper)).toBe('dark')
    expect(getThemeSelectValue(wrapper)).toBe('dark')

    wrapper.unmount()
  })

  it('忽略无效的持久化主题', () => {
    local.set(STORAGE_KEY, 'invalid')

    const wrapper = mountApp()

    expect(getThemeAppearance(wrapper)).toBe('light')

    wrapper.unmount()
  })

  it('选择主题后更新边界并持久化', async () => {
    const wrapper = mountApp()
    const select = wrapper.find('web-ui-select')
    ;(select.element as HTMLElement & { value: string }).value = 'system'

    await select.trigger('change')

    expect(getThemeAppearance(wrapper)).toBe('system')
    expect(local.get(STORAGE_KEY)).toBe('system')

    wrapper.unmount()
  })
})
