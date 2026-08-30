import '@/assets/global.css'
import { createApp } from 'vue'

import App from '@/App.vue'
import { installHistoryNav } from '@/composables/useHistoryNav'
import { router } from '@/router'
import { pinia } from '@/stores'

installHistoryNav()

createApp(App).use(pinia).use(router).mount('#app')
