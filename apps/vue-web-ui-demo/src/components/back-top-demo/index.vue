<script setup lang="ts">
import type { WebUiBackTop } from '@greypan/web-ui'
import { onMounted, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'

// scrollTarget 是 element 属性而非 attribute，模板绑定无法生效，需在容器挂载后手动赋值
function useScrollBox() {
  const box = ref<HTMLElement>()
  const backTop = ref<WebUiBackTop>()
  const setBox = (el: Element | ComponentPublicInstance | null) => (box.value = (el as HTMLElement | null) ?? undefined)
  const setBackTop = (el: Element | ComponentPublicInstance | null) =>
    (backTop.value = (el as WebUiBackTop | null) ?? undefined)
  onMounted(() => {
    if (box.value && backTop.value) backTop.value.scrollTarget = box.value
  })
  return { setBox, setBackTop }
}

const scrollBox = useScrollBox()
const thresholdBox = useScrollBox()
const customBox = useScrollBox()
const instantBox = useScrollBox()
</script>

<template>
  <div>
    <h1>BackTop 回到顶部</h1>

    <h2>页面级滚动</h2>
    <p class="mb-2 text-sm text-[var(--wui-color-text-muted)]">
      向下滚动页面超过阈值后出现按钮，点击或按 Enter 回到顶部。站点右下角已挂载全局按钮， 本示例通过
      <code>--web-ui-back-top-left / --web-ui-back-top-right</code> 定位到左下角以便区分。
    </p>
    <div class="mb-6 min-h-80 rounded-xl border border-[var(--wui-color-border)] p-4">
      <p>这是一个占位区域：滚动页面观察左下角的回到顶部按钮。</p>
    </div>
    <web-ui-back-top class="page-back-top"></web-ui-back-top>

    <h2>自定义滚动容器</h2>
    <p class="mb-2 text-sm text-[var(--wui-color-text-muted)]">
      通过 scrollTarget 指定滚动容器：按钮悬浮于容器右下角，仅容器滚动时显示。
    </p>
    <div :ref="scrollBox.setBox" class="back-top-scroll-box">
      <p v-for="i in 30" :key="i">滚动容器第 {{ i }} 行</p>
      <web-ui-back-top :ref="scrollBox.setBackTop"></web-ui-back-top>
    </div>

    <h2>自定义阈值</h2>
    <p class="mb-2 text-sm text-[var(--wui-color-text-muted)]">threshold="300"：容器滚动超过 300px 才显示按钮。</p>
    <div :ref="thresholdBox.setBox" class="back-top-scroll-box">
      <p v-for="i in 30" :key="i">滚动容器第 {{ i }} 行</p>
      <web-ui-back-top :ref="thresholdBox.setBackTop" :threshold="300"></web-ui-back-top>
    </div>

    <h2>自定义内容</h2>
    <p class="mb-2 text-sm text-[var(--wui-color-text-muted)]">默认 slot 可替换按钮内容。</p>
    <div :ref="customBox.setBox" class="back-top-scroll-box">
      <p v-for="i in 30" :key="i">滚动容器第 {{ i }} 行</p>
      <web-ui-back-top :ref="customBox.setBackTop">
        <web-ui-button variant="primary">回到顶部</web-ui-button>
      </web-ui-back-top>
    </div>

    <h2>立即滚动</h2>
    <p class="mb-2 text-sm text-[var(--wui-color-text-muted)]">
      scroll-behavior="auto"：点击后瞬间回到顶部，无平滑滚动动画。
    </p>
    <div :ref="instantBox.setBox" class="back-top-scroll-box">
      <p v-for="i in 30" :key="i">滚动容器第 {{ i }} 行</p>
      <web-ui-back-top :ref="instantBox.setBackTop" scroll-behavior="auto"></web-ui-back-top>
    </div>
  </div>
</template>

<style scoped>
.back-top-scroll-box {
  overflow: auto;

  box-sizing: border-box;
  height: 12rem;
  padding: 12px;
  border: 1px solid var(--wui-color-border);
  border-radius: 12px;

  background-color: var(--wui-color-surface-raised);
}

.page-back-top {
  --web-ui-back-top-left: 24px;
  --web-ui-back-top-right: auto;
}
</style>
