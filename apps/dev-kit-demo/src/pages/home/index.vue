<script setup lang="ts">
import AppRouterLink from '@/app/app-router-link.vue'
import { BROWSER_KIT_NAV_SECTION, JS_KIT_NAV_SECTION } from '@/nav'
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-8">
    <header class="flex flex-col gap-3">
      <h1 class="text-3xl font-bold tracking-tight">@greypan Dev Kit</h1>
      <p class="max-w-2xl text-base text-(--wui-color-text-secondary)">
        面向现代 TypeScript 与浏览器的零框架依赖工具集：提供可组合插件、URL/定时器/Result
        范式与浏览器存储、埋点、环境检测、历史导航等能力。
      </p>
    </header>

    <section class="grid gap-4 md:grid-cols-2" aria-label="工具包入口">
      <article class="flex flex-col justify-between gap-4 rounded-2xl border border-(--wui-color-border) p-6">
        <div class="flex flex-col gap-2">
          <h2 class="text-xl font-semibold">@greypan/js-kit</h2>
          <p class="text-sm text-(--wui-color-text-secondary)">
            通用 JavaScript / TypeScript 工具与可组合插件系统，适用于浏览器、Node.js 与 Worker。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppRouterLink
            to="/js-kit/getting-started"
            class="rounded-lg bg-(--wui-color-accent) px-3 py-1.5 text-sm font-medium text-(--wui-color-on-accent)"
          >
            快速开始
          </AppRouterLink>
          <AppRouterLink
            to="/js-kit/plugin-system"
            class="rounded-lg border border-(--wui-color-border) px-3 py-1.5 text-sm"
          >
            浏览模块
          </AppRouterLink>
        </div>
      </article>

      <article class="flex flex-col justify-between gap-4 rounded-2xl border border-(--wui-color-border) p-6">
        <div class="flex flex-col gap-2">
          <h2 class="text-xl font-semibold">@greypan/browser-kit</h2>
          <p class="text-sm text-(--wui-color-text-secondary)">
            浏览器运行时工具集：带 TTL 的命名空间存储、可组合埋点、环境检测、文件下载、剪贴板与历史导航。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppRouterLink
            to="/browser-kit/getting-started"
            class="rounded-lg bg-(--wui-color-accent) px-3 py-1.5 text-sm font-medium text-(--wui-color-on-accent)"
          >
            快速开始
          </AppRouterLink>
          <AppRouterLink
            to="/browser-kit/storage"
            class="rounded-lg border border-(--wui-color-border) px-3 py-1.5 text-sm"
          >
            浏览模块
          </AppRouterLink>
        </div>
      </article>
    </section>

    <section class="grid gap-6 md:grid-cols-2" aria-label="模块清单">
      <div class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">js-kit 模块</h2>
        <div class="grid grid-cols-2 gap-2">
          <AppRouterLink
            v-for="item in JS_KIT_NAV_SECTION.items"
            :key="item.path"
            :to="item.path"
            class="rounded-xl border border-(--wui-color-border) px-3 py-2 text-sm hover:border-(--wui-color-accent)"
          >
            {{ item.label }}
          </AppRouterLink>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <h2 class="text-lg font-semibold">browser-kit 模块</h2>
        <div class="grid grid-cols-2 gap-2">
          <AppRouterLink
            v-for="item in BROWSER_KIT_NAV_SECTION.items"
            :key="item.path"
            :to="item.path"
            class="rounded-xl border border-(--wui-color-border) px-3 py-2 text-sm hover:border-(--wui-color-accent)"
          >
            {{ item.label }}
          </AppRouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
