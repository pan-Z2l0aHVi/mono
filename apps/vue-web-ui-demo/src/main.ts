import '@/assets/global.css'
import '@/generated/examples.css'
import '@/locales/main.loader.js'

import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import BootError from '@/app/boot-error.vue'
import App from '@/app/index.vue'
import { bootstrapLocale, bootDegraded } from '@/i18n/locale'

// GitHub Pages 子路径 SPA
// 通过其根 404 页面在 `redirect` 中保留了未匹配的 history 路由。
// 在 Vue 路由器读取浏览器位置之前替换。
if (import.meta.env.PROD) {
  const redirectedRoute = new URLSearchParams(window.location.search).get('redirect')
  if (redirectedRoute?.startsWith('/')) {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
    window.history.replaceState(null, '', `${basePath}${redirectedRoute}`)
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home'
    },
    ...routes
  ],
  // 与 react demo 的 scrollRestoration: true 对齐：前进后退还原本页位置，其余进入新页面都从顶部开始。
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}
if (import.meta.hot) {
  handleHotUpdate(router)
}

const initial = await bootstrapLocale().catch(error => {
  console.error('Language initialization failed', error)
  createApp(BootError).mount('#app')
})

if (initial) {
  bootDegraded.value = initial.degraded
  if (initial.degraded) console.warn('Preferred language unavailable', initial.error)
  createApp(App).use(createPinia()).use(router).use(createHead()).mount('#app')
}
