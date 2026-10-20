<script setup lang="ts">
import { ref } from 'vue'

const basicVal = ref('mon')
const groupVal = ref('banana')
const disabledVal = ref('apple')
const insetVal = ref('banana')
const raisedVal = ref('banana')
</script>

<template>
  <div>
    <h1>segmented</h1>

    <h2>Basic usage</h2>
    <div class="mb-3">
      <web-ui-segmented :value="basicVal" @input="basicVal = $event.target.value">
        <web-ui-segmented-trigger value="mon">Monday</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="tue">Tuesday</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="wed">Wednesday</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="thu">Thursday</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="fri">Friday</web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ basicVal }}</p>
    <p class="text-xs text-gray-400">
      💡 Drag the current selection to track it smoothly, release to snap to the nearest option, or flick to throw
    </p>

    <h2>Disabled</h2>
    <div class="mb-3">
      <web-ui-segmented disabled :value="disabledVal" @input="disabledVal = $event.target.value">
        <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ disabledVal }}</p>

    <h2>Segmented Group</h2>
    <div class="mb-3">
      <web-ui-segmented :value="groupVal" @input="groupVal = $event.target.value">
        <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ groupVal }}</p>

    <h2>Variants</h2>
    <p class="mb-3 text-sm text-gray-500">
      variant controls the track and the resting indicator material, inset by default.
    </p>
    <div class="mb-3 flex flex-wrap gap-8">
      <div>
        <p class="mb-1 text-sm text-gray-500">variant=&quot;inset&quot; (default)</p>
        <web-ui-segmented :value="insetVal" @input="insetVal = $event.target.value">
          <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
        </web-ui-segmented>
        <p class="mt-1 text-sm text-gray-500">选中值：{{ insetVal }}</p>
      </div>
      <div>
        <p class="mb-1 text-sm text-gray-500">variant="raised"</p>
        <web-ui-segmented variant="raised" :value="raisedVal" @input="raisedVal = $event.target.value">
          <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
        </web-ui-segmented>
        <p class="mt-1 text-sm text-gray-500">选中值：{{ raisedVal }}</p>
      </div>
    </div>
    <p class="text-xs text-gray-400">
      💡 In both variants the pressed/dragging indicator is transparent glass (backdrop blur, 1.5x scale)
    </p>
  </div>
</template>
