import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/LibraryPage.vue')
    },
    {
      path: '/tags',
      component: () => import('@/pages/TagsPage.vue')
    },
    {
      path: '/map',
      component: () => import('@/pages/MapPage.vue')
    },
    {
      path: '/settings',
      component: () => import('@/pages/SettingsPage.vue')
    }
  ]
})
