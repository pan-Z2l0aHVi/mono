<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-svg-draw-lines :duration="1200">
      <svg
        viewBox="0 0 24 24"
        width="48"
        height="48"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 12 L10 18 L20 6"></path>
      </svg>
    </web-ui-svg-draw-lines>
    <span class="text-xs text-(--wui-color-text-secondary)">挂载后自动画入一次</span>
  </div>
</template>
