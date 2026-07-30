import { local } from '@greypan/browser-kit/storage'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createRouter, createWebHistory } from 'vue-router'

import App from '@/app/index.vue'

const STORAGE_KEY = 'theme-appearance'
const MOTION_STORAGE_KEY = 'theme-motion'

const router = createRouter({
  history: createWebHistory(),
  routes: []
})

function getThemeAppearance(wrapper: ReturnType<typeof mountApp>): string {
  return (wrapper.find('web-ui-theme').element as HTMLElement & { appearance: string }).appearance
}

function getThemeMotion(wrapper: ReturnType<typeof mountApp>): string {
  return (wrapper.find('web-ui-theme').element as HTMLElement & { motion: string }).motion
}

function getThemeSelectValue(wrapper: ReturnType<typeof mountApp>): string {
  return (wrapper.find("web-ui-select[aria-label='全局主题']").element as HTMLElement & { value: string }).value
}

function getThemeMotionSelectValue(wrapper: ReturnType<typeof mountApp>): string {
  return (wrapper.find("web-ui-select[aria-label='全局动效']").element as HTMLElement & { value: string }).value
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
  local.remove(MOTION_STORAGE_KEY)
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
    const select = wrapper.find("web-ui-select[aria-label='全局主题']")
    ;(select.element as HTMLElement & { value: string }).value = 'system'

    await select.trigger('change')

    expect(getThemeAppearance(wrapper)).toBe('system')
    expect(local.get(STORAGE_KEY)).toBe('system')

    wrapper.unmount()
  })

  it('默认跟随系统动效偏好', () => {
    const wrapper = mountApp()

    expect(getThemeMotion(wrapper)).toBe('system')
    expect(getThemeMotionSelectValue(wrapper)).toBe('system')

    wrapper.unmount()
  })

  it('选择动效后更新主题范围并持久化', async () => {
    const wrapper = mountApp()
    const select = wrapper.find("web-ui-select[aria-label='全局动效']")
    ;(select.element as HTMLElement & { value: string }).value = 'reduced'

    await select.trigger('change')

    expect(getThemeMotion(wrapper)).toBe('reduced')
    expect(local.get(MOTION_STORAGE_KEY)).toBe('reduced')

    wrapper.unmount()
  })

  it('恢复持久化的动效偏好', () => {
    local.set(MOTION_STORAGE_KEY, 'full')

    const wrapper = mountApp()

    expect(getThemeMotion(wrapper)).toBe('full')
    expect(getThemeMotionSelectValue(wrapper)).toBe('full')

    wrapper.unmount()
  })
})
