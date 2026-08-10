<script setup lang="ts">
import { WebUiBackTop } from '@greypan/web-ui'
import { onMounted, ref } from 'vue'

// scrollTarget 是 element 属性而非 attribute，模板绑定无法生效，需在容器挂载后手动赋值
function useScrollBox() {
  const box = ref<HTMLElement>()
  const backTop = ref<WebUiBackTop>()
  // callback ref 的实参由 Vue 注入，运行时 instanceof 收窄到具体元素类型
  const setBox = (el: unknown) => {
    if (el instanceof HTMLElement) box.value = el
  }
  const setBackTop = (el: unknown) => {
    if (el instanceof WebUiBackTop) backTop.value = el
  }
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
      向下滚动页面超过阈值后出现按钮，点击或按 Enter 回到顶部。通过
      <code>--web-ui-back-top-position</code>、<code>--web-ui-back-top-left</code> 等自定义属性控制按钮在容器内的定位。
    </p>
    <div class="mb-6 h-80 overflow-hidden rounded-xl border border-[var(--wui-color-border)] p-4 [position:relative]">
      <p class="pb-10">这是一个占位区域：滚动页面观察左下角的回到顶部按钮。</p>
      <web-ui-back-top
        class="absolute bottom-5 left-6 right-auto [--web-ui-back-top-position:absolute]"
      ></web-ui-back-top>
    </div>

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
</style>
