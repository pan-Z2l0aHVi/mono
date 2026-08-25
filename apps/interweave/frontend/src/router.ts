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
    },
    {
      path: '/prototype/interweave-shell',
      component: () => import('@/pages/prototype/InterweaveShellPrototypePage.vue'),
      meta: { prototype: true }
    },
    {
      path: '/prototype/interweave-shell-v2',
      component: () => import('@/pages/prototype/InterweaveShellPrototypePageV2.vue'),
      meta: { prototype: true }
    }
  ]
})
