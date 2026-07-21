import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import { createRouter, createWebHistory } from 'vue-router'

import App from '@/app/index.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: []
})

describe('App 挂载测试', () => {
  it('组件应当成功渲染到 DOM', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router],
        stubs: {
          RouterView: true,
          RouterLink: true
        }
      }
    })

    expect(wrapper.exists()).toBe(true)

    expect(wrapper.element).not.toBeNull()
  })
})
