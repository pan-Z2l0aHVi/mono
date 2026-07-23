<script setup lang="ts">
import { ref } from 'vue'

const standardValue = ref(36)
const glassValue = ref(42)
const markedValue = ref(50)

function updateStandardValue(event: Event) {
  standardValue.value = getSlideValue(event)
}

function updateGlassValue(event: Event) {
  glassValue.value = getSlideValue(event)
}

function updateMarkedValue(event: Event) {
  markedValue.value = getSlideValue(event)
}

function getSlideValue(event: Event): number {
  const source = event.currentTarget
  if (!isSlide(source)) return 0
  return source.value
}

function isSlide(target: EventTarget | null): target is HTMLElement & { value: number } {
  return (
    target instanceof HTMLElement &&
    target.localName === 'web-ui-slide' &&
    typeof (target as { value?: unknown }).value === 'number'
  )
}
</script>

<template>
  <div class="slide-demo">
    <h1>滑块</h1>

    <section>
      <h2>基础样式</h2>
      <div class="examples">
        <div class="example"><web-ui-slide :value="standardValue" @input="updateStandardValue" /></div>
        <div class="example"><web-ui-slide :value="glassValue" glass @input="updateGlassValue" /></div>
        <div class="example"><web-ui-slide :value="42" disabled /></div>
      </div>
    </section>

    <section>
      <h2>刻度</h2>
      <div class="examples">
        <div class="example"><web-ui-slide :value="markedValue" :step="10" marks @input="updateMarkedValue" /></div>
        <div class="example"><web-ui-slide :value="70" :step="10" marks glass /></div>
        <div class="example"><web-ui-slide :value="50" :step="10" marks disabled /></div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.slide-demo {
  max-width: 920px;
}

section {
  margin-top: 28px;
}

.examples {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  padding: 20px 0;
}

.example {
  display: flex;
  align-items: center;
  min-width: 0;
}

web-ui-slide {
  width: 100%;
}

@media (width <= 700px) {
  .examples {
    grid-template-columns: 1fr;
  }
}
</style>
