import { createRouter, createWebHashHistory } from 'vue-router'

import LibraryPage from '@/pages/LibraryPage.vue'
import RepairPage from '@/pages/RepairPage.vue'
import SettingsPage from '@/pages/SettingsPage.vue'
import TagsPage from '@/pages/TagsPage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/library' },
    { path: '/library', component: LibraryPage },
    { path: '/tags', component: TagsPage },
    { path: '/repair', component: RepairPage },
    { path: '/settings', component: SettingsPage }
  ]
})
