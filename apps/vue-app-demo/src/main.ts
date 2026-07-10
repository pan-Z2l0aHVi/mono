import '@/assets/style.css'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import App from '@/app/index.vue'

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
const pinia = createPinia()
const head = createHead()
const app = createApp(App)

app.use(pinia).use(router).use(head).mount('#app')
