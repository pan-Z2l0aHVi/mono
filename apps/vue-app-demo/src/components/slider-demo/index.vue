<script setup lang="ts">
import { ref } from 'vue'

const standardValue = ref(36)
const markedValue = ref(50)
const inputValue = ref(40)
const changeValue = ref(40)

function updateStandardValue(event: Event) {
  standardValue.value = getSlideValue(event)
}

function updateMarkedValue(event: Event) {
  markedValue.value = getSlideValue(event)
}

function updateInputValue(event: Event) {
  inputValue.value = getSlideValue(event)
}

function updateChangeValue(event: Event) {
  changeValue.value = getSlideValue(event)
}

function getSlideValue(event: Event): number {
  const source = event.currentTarget
  if (!isSlider(source)) return 0
  return source.value
}

function isSlider(target: EventTarget | null): target is HTMLElement & { value: number } {
  return (
    target instanceof HTMLElement &&
    target.localName === 'web-ui-slider' &&
    typeof (target as { value?: unknown }).value === 'number'
  )
}
</script>

<template>
  <div class="slider-demo">
    <h1>滑块</h1>

    <section>
      <h2>基础样式</h2>
      <div class="examples">
        <div class="example"><web-ui-slider :value="standardValue" @input="updateStandardValue" /></div>
        <div class="example"><web-ui-slider :value="42" /></div>
        <div class="example"><web-ui-slider :value="42" disabled /></div>
      </div>
    </section>

    <section>
      <h2>刻度</h2>
      <div class="examples">
        <div class="example"><web-ui-slider :value="markedValue" :step="10" marks @input="updateMarkedValue" /></div>
        <div class="example"><web-ui-slider :value="70" :step="10" marks /></div>
        <div class="example"><web-ui-slider :value="50" :step="10" marks disabled /></div>
      </div>
    </section>

    <section>
      <h2>范围与事件</h2>
      <div class="event-example">
        <web-ui-slider
          :value="inputValue"
          :min="10"
          :max="90"
          :step="5"
          marks
          @input="updateInputValue"
          @change="updateChangeValue"
        />
        <output>input: {{ inputValue }} / change: {{ changeValue }}</output>
      </div>
    </section>
  </div>
</template>

<style scoped>
.slider-demo {
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

.event-example {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 20px 0;
}

output {
  font-size: 14px;
  color: #5d6675;
}

web-ui-slider {
  width: 100%;
}

@media (width <= 700px) {
  .examples {
    grid-template-columns: 1fr;
  }

  .event-example {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
