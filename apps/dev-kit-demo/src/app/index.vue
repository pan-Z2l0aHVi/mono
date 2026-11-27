<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import { createShellState, isNavActive, NAV_ITEM_CLASS, NAV_SECTION_TITLE_CLASS } from '@greypan/doc-demo-kit'
import type { WebUiEvent, WebUiLayout, WebUiSelect } from '@greypan/web-ui'
import { toast } from '@greypan/web-ui'
import {
  antDesignSyncOutlined,
  icOutlineMotionPhotosOff,
  icOutlineMotionPhotosOn,
  lucideContrast,
  lucideLanguages,
  lucideMoon,
  lucideSun,
  lucideX
} from '@greypan/web-ui/icons'
import { useHead } from '@unhead/vue'
import {
  OverlayScrollbarsComponent,
  useOverlayScrollbars,
  type OverlayScrollbarsComponentRef
} from 'overlayscrollbars-vue'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Search from '@/components/search/index.vue'
import { bootDegraded, currentLocale, loadDemoLocale, localePending } from '@/i18n/locale'
import {
  BROWSER_KIT_NAV_SECTION,
  DEPS_RELOAD_NAV_SECTION,
  JS_KIT_NAV_SECTION,
  UNPLUGIN_WEB_COMPONENTS_NAV_SECTION
} from '@/nav'
import { useMobile } from '@/state/mobile'

import RouteProgressBar from './route-progress-bar.vue'
import SidebarNavGroup from './sidebar-nav-group.vue'
import SidebarNavLink from './sidebar-nav-link.vue'

const ZH_LABEL = '简体中文'
const EN_LABEL = 'English'

async function updateLocale(event: WebUiEvent<WebUiSelect, 'change'>) {
  const value = event.currentTarget.value
  if (value !== 'zh-CN' && value !== 'en') return
  event.currentTarget.value = currentLocale.value
  try {
    await loadDemoLocale(value)
  } catch (error) {
    console.error(error)
    toast.error('语言切换失败，请刷新页面后重试')
  }
}

const shell = createShellState()
const snapshot = shallowRef(shell.getSnapshot())
shell.subscribe(() => {
  snapshot.value = shell.getSnapshot()
})
const isMobileSidebarViewport = useMobile()
watch(isMobileSidebarViewport, mobile => shell.setMobile(mobile), { immediate: true })
const themeAppearance = computed(() => snapshot.value.appearance)
const themeMotion = computed(() => snapshot.value.motion)
const sidebarCollapsed = computed(() => snapshot.value.sidebarCollapsed)
const sidebarOpen = computed(() => snapshot.value.sidebarOpen)
const sidebarWidth = computed(() => snapshot.value.sidebarWidth)
const navCollapsed = computed(() => snapshot.value.navCollapsed)

function updateLayoutEvent(
  event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change' | 'sidebar-open-change' | 'sidebar-width-change'>
) {
  shell.applyLayoutEvent(event)
}

function updateThemeAppearance(event: WebUiEvent<WebUiSelect, 'change'>) {
  shell.setAppearance(event.currentTarget.value)
}

function updateThemeMotion(event: WebUiEvent<WebUiSelect, 'change'>) {
  shell.setMotion(event.currentTarget.value)
}

function closeSidebar() {
  shell.setSidebarOpen(false)
}

const bannerVisible = ref(true)
const searchOpen = ref(false)
const controlsRef = ref<HTMLElement | null>(null)
const shellLayout = ref<WebUiLayout | null>(null)

const route = useRoute()
const router = useRouter()

const jsKitOpen = ref(true)
const browserKitOpen = ref(true)
const depsReloadOpen = ref(true)
const unpluginWebComponentsOpen = ref(true)

const isJsKitActive = computed(() => route.path.startsWith('/js-kit/'))
const isBrowserKitActive = computed(() => route.path.startsWith('/browser-kit/'))
const isDepsReloadActive = computed(() => route.path.startsWith('/deps-reload/'))
const isUnpluginWebComponentsActive = computed(() => route.path.startsWith('/unplugin-web-components/'))

watch(
  () => route.path,
  path => {
    if (path.startsWith('/js-kit/')) jsKitOpen.value = true
    if (path.startsWith('/browser-kit/')) browserKitOpen.value = true
    if (path.startsWith('/deps-reload/')) depsReloadOpen.value = true
    if (path.startsWith('/unplugin-web-components/')) unpluginWebComponentsOpen.value = true
  },
  { immediate: true }
)

useHead({ title: () => route.meta.title ?? 'Dev Kit Demo' })
const navSidebar = ref<OverlayScrollbarsComponentRef>()
const [initPageScrollbars] = useOverlayScrollbars({ options: appScrollbarsOptions })

watch(bootDegraded, degraded => {
  if (!degraded) return
  toast.warning('目标语种加载失败，暂时使用简体中文')
  bootDegraded.value = false
})

onMounted(async () => {
  initPageScrollbars(document.body)
  await router.isReady()
  requestAnimationFrame(() => {
    const link = navSidebar.value?.getElement()?.querySelector('[data-active="true"]')
    link?.scrollIntoView({ block: 'center' })
  })
})
</script>

<template>
  <web-ui-theme :appearance="themeAppearance" :motion="themeMotion">
    <div class="min-h-screen bg-(--wui-color-page) text-(--wui-color-text)">
      <RouteProgressBar />
      <web-ui-layout
        ref="shellLayout"
        class="mobile:[--wui-layout-sidebar-radius:38px]"
        header-glow
        sidebar-collapsible
        :mobile="isMobileSidebarViewport"
        :sidebarCollapsed="sidebarCollapsed"
        :sidebarOpen="sidebarOpen"
        :sidebarWidth="sidebarWidth"
        sidebar-resizable
        sidebar-min-width="120px"
        sidebar-max-width="400px"
        @sidebar-collapsed-change="updateLayoutEvent"
        @sidebar-open-change="updateLayoutEvent"
        @sidebar-width-change="updateLayoutEvent"
      >
        <div
          v-if="bannerVisible"
          slot="banner"
          class="relative grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-2 bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
        >
          <web-ui-button
            class="absolute top-1/2 right-4 -translate-y-1/2"
            size="24"
            icon
            variant="ghost"
            aria-label="关闭横幅"
            @click="bannerVisible = false"
          >
            <web-ui-icon class="text-(--wui-color-on-accent)" :icon="lucideX"></web-ui-icon>
          </web-ui-button>
          <span class="col-start-2 text-center">js-kit 与 browser-kit 交互文档站</span>
        </div>

        <div
          slot="header"
          class="flex h-full w-full items-center justify-end gap-2 px-4 py-2 mobile:w-[calc(100vw-60px)] mobile:gap-1.5 mobile:px-2 mobile:py-2"
        >
          <div ref="controlsRef" class="flex min-w-0 items-center gap-2 mobile:gap-1.5">
            <div
              :class="searchOpen ? 'flex items-center gap-2 mobile:hidden' : 'flex items-center gap-2 mobile:gap-1.5'"
            >
              <web-ui-select variant="icon" :value="themeMotion" aria-label="全局动效" @change="updateThemeMotion">
                <web-ui-icon
                  slot="trigger"
                  :icon="
                    themeMotion === 'full'
                      ? icOutlineMotionPhotosOn
                      : themeMotion === 'reduced'
                        ? icOutlineMotionPhotosOff
                        : antDesignSyncOutlined
                  "
                  :size="18"
                ></web-ui-icon>
                <web-ui-option value="full" label="完整动效">完整动效</web-ui-option>
                <web-ui-option value="reduced" label="减弱动效">减弱动效</web-ui-option>
                <web-ui-option value="system" label="跟随系统">跟随系统</web-ui-option>
              </web-ui-select>
              <web-ui-select
                variant="icon"
                :value="themeAppearance"
                placement="bottom"
                aria-label="全局主题"
                @change="updateThemeAppearance"
              >
                <web-ui-icon
                  slot="trigger"
                  :icon="
                    themeAppearance === 'light' ? lucideSun : themeAppearance === 'dark' ? lucideMoon : lucideContrast
                  "
                  :size="18"
                ></web-ui-icon>
                <web-ui-option value="light" label="浅色模式">浅色模式</web-ui-option>
                <web-ui-option value="dark" label="深色模式">深色模式</web-ui-option>
                <web-ui-option value="system" label="跟随系统">跟随系统</web-ui-option>
              </web-ui-select>
              <web-ui-select
                variant="icon"
                :value="currentLocale"
                :disabled="localePending"
                :aria-busy="localePending"
                aria-label="全局语言"
                @change="updateLocale"
              >
                <web-ui-icon slot="trigger" :icon="lucideLanguages" :size="18"></web-ui-icon>
                <web-ui-option value="zh-CN" :label="ZH_LABEL">{{ ZH_LABEL }}</web-ui-option>
                <web-ui-option value="en" :label="EN_LABEL">{{ EN_LABEL }}</web-ui-option>
              </web-ui-select>
              <span v-if="localePending" class="sr-only" role="status">正在加载语言</span>
            </div>
            <Search v-model:open="searchOpen" :controls="controlsRef" />
          </div>
        </div>

        <OverlayScrollbarsComponent
          slot="sidebar"
          ref="navSidebar"
          :options="appScrollbarsOptions"
          class="relative z-20 h-full min-h-0 overflow-y-auto p-2 mobile:p-0"
          aria-label="应用导航"
        >
          <nav class="grid min-w-0 grid-cols-1 gap-1" aria-label="主导航">
            <SidebarNavLink
              to="/home"
              label="总览"
              :active="isNavActive(route.path, '/home')"
              :collapsed="navCollapsed"
              :item-class="NAV_ITEM_CLASS"
              :title="navCollapsed ? undefined : '总览'"
              @navigate="closeSidebar"
            />

            <div role="group" aria-labelledby="nav-section-utils" class="grid min-w-0 grid-cols-1 gap-1">
              <h2 id="nav-section-utils" :class="[NAV_SECTION_TITLE_CLASS, navCollapsed ? 'sr-only' : '']">工具库</h2>
              <SidebarNavGroup
                v-model:open="jsKitOpen"
                group-id="js-kit"
                label="js-kit"
                :active="isJsKitActive"
                :collapsed="navCollapsed"
                :item-class="NAV_ITEM_CLASS"
              >
                <SidebarNavLink
                  to="/js-kit/getting-started"
                  label="快速开始"
                  :active="isNavActive(route.path, '/js-kit/getting-started')"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
                <SidebarNavLink
                  to="/js-kit/changelog"
                  label="更新日志"
                  :active="isNavActive(route.path, '/js-kit/changelog')"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
                <SidebarNavLink
                  v-for="item in JS_KIT_NAV_SECTION.items"
                  :key="item.path"
                  :to="item.path"
                  :label="item.label"
                  :active="isNavActive(route.path, item.path)"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
              </SidebarNavGroup>

              <SidebarNavGroup
                v-model:open="browserKitOpen"
                group-id="browser-kit"
                label="browser-kit"
                :active="isBrowserKitActive"
                :collapsed="navCollapsed"
                :item-class="NAV_ITEM_CLASS"
              >
                <SidebarNavLink
                  to="/browser-kit/getting-started"
                  label="快速开始"
                  :active="isNavActive(route.path, '/browser-kit/getting-started')"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
                <SidebarNavLink
                  to="/browser-kit/changelog"
                  label="更新日志"
                  :active="isNavActive(route.path, '/browser-kit/changelog')"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
                <SidebarNavLink
                  v-for="item in BROWSER_KIT_NAV_SECTION.items"
                  :key="item.path"
                  :to="item.path"
                  :label="item.label"
                  :active="isNavActive(route.path, item.path)"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
              </SidebarNavGroup>
            </div>

            <div role="group" aria-labelledby="nav-section-plugins" class="grid min-w-0 grid-cols-1 gap-1">
              <h2 id="nav-section-plugins" :class="[NAV_SECTION_TITLE_CLASS, navCollapsed ? 'sr-only' : '']">
                构建插件
              </h2>
              <SidebarNavGroup
                v-model:open="depsReloadOpen"
                group-id="deps-reload"
                label="deps-reload"
                :active="isDepsReloadActive"
                :collapsed="navCollapsed"
                :item-class="NAV_ITEM_CLASS"
              >
                <SidebarNavLink
                  to="/deps-reload/getting-started"
                  label="快速开始"
                  :active="isNavActive(route.path, '/deps-reload/getting-started')"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
                <SidebarNavLink
                  to="/deps-reload/changelog"
                  label="更新日志"
                  :active="isNavActive(route.path, '/deps-reload/changelog')"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
                <SidebarNavLink
                  v-for="item in DEPS_RELOAD_NAV_SECTION.items"
                  :key="item.path"
                  :to="item.path"
                  :label="item.label"
                  :active="isNavActive(route.path, item.path)"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
              </SidebarNavGroup>

              <SidebarNavGroup
                v-model:open="unpluginWebComponentsOpen"
                group-id="unplugin-web-components"
                label="unplugin-web-components"
                :active="isUnpluginWebComponentsActive"
                :collapsed="navCollapsed"
                :item-class="NAV_ITEM_CLASS"
              >
                <SidebarNavLink
                  to="/unplugin-web-components/getting-started"
                  label="快速开始"
                  :active="isNavActive(route.path, '/unplugin-web-components/getting-started')"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
                <SidebarNavLink
                  to="/unplugin-web-components/changelog"
                  label="更新日志"
                  :active="isNavActive(route.path, '/unplugin-web-components/changelog')"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
                <SidebarNavLink
                  v-for="item in UNPLUGIN_WEB_COMPONENTS_NAV_SECTION.items"
                  :key="item.path"
                  :to="item.path"
                  :label="item.label"
                  :active="isNavActive(route.path, item.path)"
                  :collapsed="navCollapsed"
                  :item-class="NAV_ITEM_CLASS"
                  @navigate="closeSidebar"
                />
              </SidebarNavGroup>
            </div>
          </nav>
        </OverlayScrollbarsComponent>

        <div class="p-3 pb-12 sm:px-6 sm:pb-16 md:px-8 lg:px-10">
          <RouterView v-slot="{ Component, route: currentRoute }">
            <KeepAlive>
              <component :is="Component" v-if="currentRoute.meta.keepAlive" :key="currentRoute.path" />
            </KeepAlive>
            <component :is="Component" v-if="!currentRoute.meta.keepAlive" :key="currentRoute.path" />
          </RouterView>
        </div>
      </web-ui-layout>
      <web-ui-back-top></web-ui-back-top>
    </div>
  </web-ui-theme>
</template>
