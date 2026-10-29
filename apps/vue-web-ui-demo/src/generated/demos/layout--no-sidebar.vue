<template>
  <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
    <web-ui-layout no-sidebar header-glow>
      <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
      <div class="p-4">
        <p class="m-0 text-sm">no-sidebar 下没有 aside、Toggle 和 Drawer，内容列占满整行。</p>
        <div class="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
      </div>
      <div slot="tabbar" class="flex items-center justify-center px-4 py-2 text-xs">Tabbar</div>
    </web-ui-layout>
  </div>
</template>
