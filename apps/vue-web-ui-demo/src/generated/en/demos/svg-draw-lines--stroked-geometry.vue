<template>
  <div class="flex flex-wrap items-end gap-8">
    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 45 L35 10 L65 45"></path>
          <line x1="65" y1="45" x2="95" y2="10"></line>
        </svg>
      </web-ui-svg-draw-lines>
      <span class="text-xs text-(--wui-color-text-secondary)">path + line</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="12" width="38" height="38"></rect>
          <circle cx="75" cy="31" r="18"></circle>
        </svg>
      </web-ui-svg-draw-lines>
      <span class="text-xs text-(--wui-color-text-secondary)">rect + circle</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6,52 22,12 38,52"></polyline>
          <polygon points="60,52 78,12 96,52"></polygon>
        </svg>
      </web-ui-svg-draw-lines>
      <span class="text-xs text-(--wui-color-text-secondary)">polyline + polygon</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines>
        <svg viewBox="0 0 100 60" width="100" height="60" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 10 L44 10 L44 44 L6 44 Z"></path>
          <ellipse cx="76" cy="28" rx="18" ry="11"></ellipse>
        </svg>
      </web-ui-svg-draw-lines>
      <span class="text-xs text-(--wui-color-text-secondary)">Closed path (ending with Z) + ellipse</span>
    </div>
  </div>
</template>
