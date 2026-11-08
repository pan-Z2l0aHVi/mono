<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import {
  createShellState,
  isNavActive,
  NAV_ITEM_CLASS,
  NAV_SECTIONS,
  NAV_SECTION_TITLE_CLASS
} from '@greypan/doc-demo-kit'
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
import { useMobile } from '@/state/mobile'

import SidebarNavLink from './sidebar-nav-link.vue'

const ZH_LABEL = '简体中文'
const EN_LABEL = 'English'

async function updateLocale(event: WebUiEvent<WebUiSelect, 'change'>) {
  const value = event.currentTarget.value
  if (value !== 'zh-CN' && value !== 'en') return
  // 选择器是受控宿主，准备期间及失败后保持已提交值。
  event.currentTarget.value = currentLocale.value
  try {
    await loadDemoLocale(value)
  } catch (error) {
    console.error(error)
    toast.error('语言切换失败，请刷新页面后重试')
  }
}

/*
 * shell 状态（主题 / 动效 / 侧栏 collapsed / open / 宽度的持久化、校验、layout 事件过滤与
 * mobile 派生）由 kit 的 `createShellState` 拥有；这里只把快照接进 Vue 响应式与 `useMobile`
 * 的断点判定（判定留在 app，ADR-0023）。snapshot 只在提交时整体换引用，shallowRef 按引用
 * 比较恰好匹配这个约定。
 */
const shell = createShellState()
const snapshot = shallowRef(shell.getSnapshot())
shell.subscribe(() => {
  snapshot.value = shell.getSnapshot()
})
const isMobileSidebarViewport = useMobile()
watch(
  isMobileSidebarViewport,
  mobile => shell.setMobile(mobile),
  // immediate：setup 期就把当前断点写进状态机，首帧的 drawer 宽度与展开态就是对的。
  { immediate: true }
)
const themeAppearance = computed(() => snapshot.value.appearance)
const themeMotion = computed(() => snapshot.value.motion)
const sidebarCollapsed = computed(() => snapshot.value.sidebarCollapsed)
const sidebarOpen = computed(() => snapshot.value.sidebarOpen)
const sidebarWidth = computed(() => snapshot.value.sidebarWidth)
const navCollapsed = computed(() => snapshot.value.navCollapsed)

// layout 的三个 sidebar 事件统一交给 shell 状态机：事件过滤（只采信自己层的冒泡）与提交都在 kit。
function updateLayoutEvent(
  event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change' | 'sidebar-open-change' | 'sidebar-width-change'>
) {
  shell.applyLayoutEvent(event)
}

// 校验与持久化都在 shell 状态机：非法值静默忽略，受控宿主保持已提交值。
function updateThemeAppearance(event: WebUiEvent<WebUiSelect, 'change'>) {
  shell.setAppearance(event.currentTarget.value)
}

function updateThemeMotion(event: WebUiEvent<WebUiSelect, 'change'>) {
  shell.setMotion(event.currentTarget.value)
}

/** 导航后收起移动端 drawer；回写经 shell 状态机，模板里的快照是只读派生。 */
function closeSidebar() {
  shell.setSidebarOpen(false)
}

const bannerVisible = ref(true)
const searchOpen = ref(false)
const shellLayout = ref<WebUiLayout | null>(null)

const route = useRoute()
const router = useRouter()

useHead({ title: () => route.meta.title })
const navSidebar = ref<OverlayScrollbarsComponentRef>()

// 整页 scrollbar 接管的是 document 的滚动元素，不是某个 DOM 容器，所以没有可渲染的宿主元素，
// 只能直接初始化 body。
const [initPageScrollbars] = useOverlayScrollbars({ options: appScrollbarsOptions })

// 目标语种与文档在挂载后补载，降级可能晚于 onMounted：用 watch 才不会漏掉提示。
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
      <!--
        Boolean 动态绑定走 camelCase Property（Vue 对已存在的属性名直接写 DOM property）。
        kebab-case（:sidebar-collapsed）会写字符串 attribute，布尔属性存在即 true，无法表达 false。
      -->
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
          <span class="col-start-2 text-center">🎉 欢迎使用 web-ui 组件库！</span>
        </div>
        <!--
          移动端为前置导航区预留 60px，与 collapsed sidebar 使用同一基准。
          移动端纵向内边距与 layout 的 `.mobile-toggle` 上间距（8px）一致，右侧控件才与左上角切换按钮同高对齐。
        -->
        <div
          slot="header"
          class="flex h-full w-full items-center justify-end gap-2 px-4 py-2 mobile:w-[calc(100vw-60px)] mobile:gap-1.5 mobile:px-2 mobile:py-2"
        >
          <div :class="searchOpen ? 'flex items-center gap-2 mobile:hidden' : 'flex items-center gap-2 mobile:gap-1.5'">
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
              <!-- 外观名称由 Wuchale 壳文案统一翻译成 Light / Dark。 -->
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
          <Search v-model:open="searchOpen" />
        </div>
        <OverlayScrollbarsComponent
          slot="sidebar"
          ref="navSidebar"
          :options="appScrollbarsOptions"
          class="relative z-20 h-full min-h-0 overflow-y-auto p-2 mobile:p-0"
          aria-label="应用导航"
        >
          <nav class="grid gap-1" aria-label="主导航">
            <SidebarNavLink
              to="/home"
              label="组件总览"
              :active="isNavActive(route.path, '/home')"
              :collapsed="navCollapsed"
              :item-class="NAV_ITEM_CLASS"
              :title="navCollapsed ? undefined : '组件总览'"
              @navigate="closeSidebar"
            />
            <SidebarNavLink
              to="/getting-started"
              label="快速开始"
              :active="isNavActive(route.path, '/getting-started')"
              :collapsed="navCollapsed"
              :item-class="NAV_ITEM_CLASS"
              :title="navCollapsed ? undefined : '快速开始'"
              @navigate="closeSidebar"
            />
            <SidebarNavLink
              to="/changelog"
              label="更新日志"
              :active="isNavActive(route.path, '/changelog')"
              :collapsed="navCollapsed"
              :item-class="NAV_ITEM_CLASS"
              :title="navCollapsed ? undefined : '更新日志'"
              @navigate="closeSidebar"
            />
            <div
              v-for="(section, index) in NAV_SECTIONS"
              :key="section.id"
              role="group"
              :aria-labelledby="`nav-section-${section.id}`"
              class="grid gap-1"
            >
              <div
                v-if="navCollapsed && index > 0"
                class="mx-2 my-1 h-px bg-(--wui-color-border)"
                aria-hidden="true"
              ></div>
              <h2 :id="`nav-section-${section.id}`" :class="[NAV_SECTION_TITLE_CLASS, navCollapsed ? 'sr-only' : '']">
                <template v-if="section.id === 'general'">通用</template>
                <template v-else-if="section.id === 'layout'">布局</template>
                <template v-else-if="section.id === 'form'">表单</template>
                <template v-else-if="section.id === 'display'">展示</template>
                <template v-else>反馈</template>
              </h2>
              <SidebarNavLink
                v-for="item in section.items"
                :key="item.path"
                :to="item.path"
                :label="item.label"
                :active="isNavActive(route.path, item.path)"
                :collapsed="navCollapsed"
                :item-class="NAV_ITEM_CLASS"
                @navigate="closeSidebar"
              />
            </div>
          </nav>
        </OverlayScrollbarsComponent>
        <div class="p-3 sm:px-6 md:px-8 lg:px-10">
          <!-- 正文 gutter 归 shell 所有：web-ui-layout 的 main 不带 padding，逐页加会漏页。 -->
          <RouterView />
        </div>
      </web-ui-layout>
      <web-ui-back-top></web-ui-back-top>
    </div>
  </web-ui-theme>
</template>
