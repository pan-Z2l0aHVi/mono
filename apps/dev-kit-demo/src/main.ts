import '@/assets/global.css'
import '@/generated/js-kit/theme.css'
import '@/locales/main.loader.js'

import { createHead } from '@unhead/vue/client'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import BootError from '@/app/boot-error.vue'
import App from '@/app/index.vue'
import { bootstrapLocale, bootDegraded, loadShellLocale } from '@/i18n/locale'
import { installRouteGuards } from '@/router/guards'
import { routeProgress } from '@/router/progress'

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
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    keepAlive?: boolean
  }
}
if (import.meta.hot) {
  handleHotUpdate(router)
}

installRouteGuards(router, routeProgress)

const shellReady = await loadShellLocale().then(
  () => true,
  error => {
    console.error('Language initialization failed', error)
    createApp(BootError).mount('#app')
    return false
  }
)

if (shellReady) {
  createApp(App).use(router).use(createHead()).mount('#app')
  void bootstrapLocale().then(
    initial => {
      bootDegraded.value = initial.degraded
      if (initial.degraded) console.warn('Preferred language unavailable', initial.error)
    },
    error => {
      console.error('Language initialization failed', error)
      bootDegraded.value = true
    }
  )
}
