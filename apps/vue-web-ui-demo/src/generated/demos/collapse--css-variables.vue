<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse
      peek="160px"
      :style="{
        '--wui-collapse-peek-edge': '28px',
        '--wui-collapse-peek-edge-blur': '10px'
      }"
    >
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        显式长度 28px · 模糊 10px
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in blurRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="160px" :style="{ '--wui-collapse-peek-edge-color': 'var(--wui-color-border)' }">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        边缘颜色取共享 border 色
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in edgeColorRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const blurRows = Array.from(
  { length: 5 },
  (_, index) => `段落 ${index + 1}：带子长度不听 peek 的 0.4 推导，模糊半径也从 4px 提到 10px。`
)
const edgeColorRows = Array.from(
  { length: 5 },
  (_, index) => `段落 ${index + 1}：裁剪边缘的底色换成 border 色，带子从边缘向内淡出。`
)
</script>
