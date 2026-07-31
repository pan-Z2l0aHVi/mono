import '@/assets/global.css'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import App from '@/app/index.vue'

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
  ]
})
// 这将在运行时更新路由而无需重新加载页面
if (import.meta.hot) {
  handleHotUpdate(router)
}

const pinia = createPinia()
const head = createHead()
const app = createApp(App)

app.use(pinia).use(router).use(head).mount('#app')
