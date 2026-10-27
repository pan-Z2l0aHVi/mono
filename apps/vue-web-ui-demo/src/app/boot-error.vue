<script setup lang="ts">
// 浏览器缓存失败的动态 import；刷新 document 后重新请求模块。
function retry() {
  window.location.reload()
}
</script>

<template>
  <main class="mx-auto max-w-xl p-8" role="alert">
    <h1 lang="en">Unable to load language resources</h1>
    <p lang="zh-CN">语言资源加载失败，请检查网络后重试。</p>
    <p lang="en">Check your connection and try again.</p>
    <button @click="retry">重试 / Retry</button>
  </main>
</template>
