<script setup lang="ts">
import type { WebUiEvent, WebUiSlider } from '@greypan/web-ui'
import { ref } from 'vue'

const standardValue = ref(36)
const markedValue = ref(50)
const inputValue = ref(40)
const changeValue = ref(40)
const verticalValue = ref(60)
const verticalMarkedValue = ref(50)

function updateStandardValue(event: WebUiEvent<WebUiSlider, 'input'>) {
  standardValue.value = event.currentTarget.value
}

function updateMarkedValue(event: WebUiEvent<WebUiSlider, 'input'>) {
  markedValue.value = event.currentTarget.value
}

function updateInputValue(event: WebUiEvent<WebUiSlider, 'input'>) {
  inputValue.value = event.currentTarget.value
}

function updateChangeValue(event: WebUiEvent<WebUiSlider, 'input'>) {
  changeValue.value = event.currentTarget.value
}

function updateVerticalValue(event: WebUiEvent<WebUiSlider, 'input'>) {
  verticalValue.value = event.currentTarget.value
}

function updateVerticalMarkedValue(event: WebUiEvent<WebUiSlider, 'input'>) {
  verticalMarkedValue.value = event.currentTarget.value
}
</script>

<template>
  <div class="slider-demo">
    <h1>slider</h1>

    <section>
      <h2>Base styles</h2>
      <div class="examples">
        <div class="example">
          <web-ui-slider aria-label="Volume" :value="standardValue" @input="updateStandardValue" />
        </div>
        <div class="example"><web-ui-slider aria-label="Default value" :value="42" /></div>
        <div class="example"><web-ui-slider aria-label="Disabled default value" :value="42" disabled /></div>
      </div>
    </section>

    <section>
      <h2>Marks</h2>
      <div class="examples">
        <div class="example">
          <web-ui-slider aria-label="Marked value" :value="markedValue" :step="10" marks @input="updateMarkedValue" />
        </div>
        <div class="example"><web-ui-slider aria-label="High marked value" :value="70" :step="10" marks /></div>
        <div class="example">
          <web-ui-slider aria-label="Disabled marked value" :value="50" :step="10" marks disabled />
        </div>
      </div>
    </section>

    <section>
      <h2>Range and events</h2>
      <div class="event-example">
        <web-ui-slider
          aria-label="Range value"
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

    <section>
      <h2>Vertical</h2>
      <div class="vertical-examples">
        <div class="example">
          <web-ui-slider aria-label="Vertical value" vertical :value="verticalValue" @input="updateVerticalValue" />
          <span class="label">{{ verticalValue }}</span>
        </div>
        <div class="example">
          <web-ui-slider
            aria-label="Vertical marked value"
            vertical
            :value="verticalMarkedValue"
            :step="10"
            marks
            @input="updateVerticalMarkedValue"
          />
          <span class="label">{{ verticalMarkedValue }}</span>
        </div>
        <div class="example">
          <web-ui-slider aria-label="Disabled vertical value" vertical :value="50" disabled />
          <span class="label">Disabled</span>
        </div>
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
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.vertical-examples {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  padding: 20px 0;
}

.label {
  font-size: 14px;
  color: #5d6675;
  white-space: nowrap;
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

web-ui-slider:not([vertical]) {
  width: 100%;
}

web-ui-slider[vertical] {
  height: 200px;
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
