<script setup lang="ts">
import { ref } from 'vue'

const brokenSrc = ref('https://broken.invalid/avatar.jpg')
</script>

<template>
  <div>
    <h1>头像</h1>

    <h2>图片头像</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-avatar src="https://cravatar.cn/avatar/test?d=mp" alt="用户1" :size="40" />
      <web-ui-avatar src="https://cravatar.cn/avatar/test?d=identicon" alt="用户2" :size="56" />
      <web-ui-avatar src="https://cravatar.cn/avatar/test?d=monsterid" alt="用户3" :size="80" />
    </div>

    <h2>首字母回退</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-avatar name="John Doe" :size="40" />
      <web-ui-avatar name="Alice" :size="56" />
      <web-ui-avatar name="张 三" :size="80" />
      <web-ui-avatar name="John Michael Doe" :size="40" />
    </div>

    <h2>默认图标回退</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-avatar :size="40" />
      <web-ui-avatar :size="56" />
      <web-ui-avatar :size="80" />
    </div>

    <h2>不同尺寸</h2>
    <div class="mb-3 flex items-end gap-3">
      <web-ui-avatar name="S" :size="24" />
      <web-ui-avatar name="M" :size="32" />
      <web-ui-avatar name="L" :size="40" />
      <web-ui-avatar name="XL" :size="56" />
      <web-ui-avatar name="XXL" :size="80" />
      <web-ui-avatar name="巨大" :size="120" />
    </div>

    <h2>方形</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-avatar src="https://cravatar.cn/avatar/test?d=retro" alt="方形图" :size="56" shape="square" />
      <web-ui-avatar name="Square" :size="56" shape="square" />
      <web-ui-avatar :size="56" shape="square" />
    </div>

    <h2>图片加载失败</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-avatar :src="brokenSrc" name="Fallback" :size="56" />
      <web-ui-avatar :src="brokenSrc" :size="56" />
    </div>

    <h2>自定义 slot 回退</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-avatar :size="56">
        <span class="text-sm font-bold text-blue-600">VIP</span>
      </web-ui-avatar>
      <web-ui-avatar :size="56">
        <span class="text-lg">⭐</span>
      </web-ui-avatar>
    </div>
  </div>
</template>
