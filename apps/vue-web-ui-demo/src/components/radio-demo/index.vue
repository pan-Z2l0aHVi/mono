<script setup lang="ts">
import type { WebUiEvent, WebUiRadioGroup } from '@greypan/web-ui'
import { ref } from 'vue'

const selected = ref('apple')
const disabledVal = ref('apple')
const groupVal = ref('banana')
const disabledGroupVal = ref('apple')
const verticalVal = ref('apple')
const horizontalVal = ref('apple')
const gapVal = ref('apple')

const updateSelected = (value: string) => {
  selected.value = value
}

function updateGroupValue(event: WebUiEvent<WebUiRadioGroup, 'change'>) {
  groupVal.value = event.currentTarget.value
}

function updateVerticalValue(event: WebUiEvent<WebUiRadioGroup, 'change'>) {
  verticalVal.value = event.currentTarget.value
}

function updateHorizontalValue(event: WebUiEvent<WebUiRadioGroup, 'change'>) {
  horizontalVal.value = event.currentTarget.value
}

function updateGapValue(event: WebUiEvent<WebUiRadioGroup, 'change'>) {
  gapVal.value = event.currentTarget.value
}
</script>

<template>
  <div>
    <h1>radio</h1>
    <h2>Basic usage</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-radio :checked="selected === 'apple'" value="apple" name="fruit" @change="updateSelected('apple')"
        >Apple</web-ui-radio
      >
      <web-ui-radio :checked="selected === 'banana'" value="banana" name="fruit" @change="updateSelected('banana')"
        >Banana</web-ui-radio
      >
      <web-ui-radio :checked="selected === 'cherry'" value="cherry" name="fruit" @change="updateSelected('cherry')"
        >Cherry</web-ui-radio
      >
    </div>
    <p class="text-sm text-gray-500">选中值：{{ selected }}</p>

    <h2>Radio Group</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-radio-group :value="groupVal" name="group-demo" @change="updateGroupValue">
        <web-ui-radio value="apple">Apple</web-ui-radio>
        <web-ui-radio value="banana">Banana</web-ui-radio>
        <web-ui-radio value="cherry">Cherry</web-ui-radio>
      </web-ui-radio-group>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ groupVal }}</p>

    <h2>Radio group layout direction</h2>
    <p class="mb-3 text-sm text-(--wui-color-text-secondary)">
      direction controls the group layout, vertical by default.
    </p>
    <div class="mb-3 flex flex-wrap gap-8">
      <div>
        <p class="mb-1 text-sm text-(--wui-color-text-secondary)">direction=&quot;vertical&quot; (default)</p>
        <web-ui-radio-group
          direction="vertical"
          :value="verticalVal"
          name="group-vertical-demo"
          @change="updateVerticalValue"
        >
          <web-ui-radio value="apple">Apple</web-ui-radio>
          <web-ui-radio value="banana">Banana</web-ui-radio>
          <web-ui-radio value="cherry">Cherry</web-ui-radio>
        </web-ui-radio-group>
      </div>
      <div>
        <p class="mb-1 text-sm text-(--wui-color-text-secondary)">direction="horizontal"</p>
        <web-ui-radio-group
          direction="horizontal"
          :value="horizontalVal"
          name="group-horizontal-demo"
          @change="updateHorizontalValue"
        >
          <web-ui-radio value="apple">Apple</web-ui-radio>
          <web-ui-radio value="banana">Banana</web-ui-radio>
          <web-ui-radio value="cherry">Cherry</web-ui-radio>
        </web-ui-radio-group>
      </div>
    </div>
    <p class="text-sm text-gray-500">选中值：vertical {{ verticalVal }} / horizontal {{ horizontalVal }}</p>

    <h2>Radio group spacing</h2>
    <p class="mb-3 text-sm text-(--wui-color-text-secondary)">
      --wui-radio-group-gap overrides the default 8px spacing.
    </p>
    <div class="mb-3">
      <web-ui-radio-group
        direction="horizontal"
        class="[--wui-radio-group-gap:16px]"
        :value="gapVal"
        name="group-gap-demo"
        @change="updateGapValue"
      >
        <web-ui-radio value="apple">Apple</web-ui-radio>
        <web-ui-radio value="banana">Banana</web-ui-radio>
        <web-ui-radio value="cherry">Cherry</web-ui-radio>
      </web-ui-radio-group>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ gapVal }}</p>

    <h2>Radio group disabled</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-radio-group disabled :value="disabledGroupVal" name="group-disabled-demo">
        <web-ui-radio value="apple">Apple</web-ui-radio>
        <web-ui-radio value="banana">Banana</web-ui-radio>
        <web-ui-radio value="cherry">Cherry</web-ui-radio>
      </web-ui-radio-group>
    </div>

    <h2>Disabled</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-radio :checked="disabledVal === 'apple'" value="apple" name="disabled-fruit" disabled>Apple</web-ui-radio>
      <web-ui-radio :checked="disabledVal === 'banana'" value="banana" name="disabled-fruit" disabled
        >Banana</web-ui-radio
      >
      <web-ui-radio :checked="disabledVal === 'cherry'" value="cherry" name="disabled-fruit" disabled
        >Cherry</web-ui-radio
      >
    </div>
  </div>
</template>
