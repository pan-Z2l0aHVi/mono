import '@/assets/global.css'

import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import App from '@/App.vue'
import { installHistoryNav } from '@/composables/useHistoryNav'
import { waitForRuntimeConfig } from '@/services/runtime'
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

/*
 * 首次渲染挡在 runtime core 注入之后。
 *
 * 平台、flags 与 bindings 都是注入之后才可信的进程事实：先渲染再补，轻则布局跳变
 * （macOS 给红绿灯留的顶部空间恰好在 header 上），重则启动期的桥接调用直接失败。
 * 挡住这一次，壳里读到的平台就是终值。纯浏览器预览没有注入，超时后照常放行。
 */
void waitForRuntimeConfig().then(ready => {
  if (!ready) console.warn('interweave: Wails runtime 未注入，按浏览器预览启动')
  createApp(App).use(pinia).use(router).mount('#app')
})
