import '@/assets/global.css'

import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import App from '@/App.vue'
import { installHistoryNav } from '@/composables/useHistoryNav'
import { pinia } from '@/stores'

// file-based 路由表是虚拟模块，dev 下新增或改名 `src/pages/**` 后要把新表灌进 router。
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/library'
    },
    ...routes
  ]
})

if (import.meta.hot) {
  handleHotUpdate(router)
}

installHistoryNav()

createApp(App).use(pinia).use(router).mount('#app')
