<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const title = ref('Click this line to edit in place')
const lastEvent = ref('(not triggered yet)')
const submitted = ref<[string, string][]>([])
const formRef = ref<HTMLFormElement>()

// 含换行的初值：常量属性只在挂载时写入一次，用户编辑后的草稿不会被绑定回写。
const multiline =
  'Newlines inside the value render as usual\nThe second line wraps with the box width, both states share one box'

function handleSubmit(event: Event) {
  event.preventDefault()
  const data = new FormData(event.currentTarget as HTMLFormElement)
  const entries: [string, string][] = []
  for (const [name, value] of data.entries()) {
    if (typeof value === 'string') entries.push([name, value])
  }
  submitted.value = entries
}

function handleChange(event: WebUiEvent<WebUiEditableText, 'change'>) {
  title.value = event.currentTarget.value
  lastEvent.value = 'change (Enter or blur commits)'
}
</script>

<template>
  <div>
    <h1>editable text</h1>

    <h2>Edit in place</h2>
    <div class="mb-3 flex flex-col gap-3">
      <p class="text-sm leading-6 text-gray-600">
        文档标题：
        <web-ui-editable-text
          :value="title"
          placeholder="Enter a title"
          aria-label="Document title"
          @change="handleChange"
          @cancel="lastEvent = 'cancel (Escape discards)'"
        />
      </p>
      <div class="text-sm text-gray-500">已提交的值：{{ title || '(empty)' }}</div>
      <div class="text-sm text-gray-500">最近事件：{{ lastEvent }}</div>
    </div>
    <p class="mb-3 text-xs text-gray-400">
      💡 点击文字进入编辑并落点光标，Enter 或失焦提交；仅 Escape 取消并恢复进入编辑时的值
    </p>

    <h2>Placeholder</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-editable-text
        value="Placeholder hidden while a value exists"
        placeholder="Placeholder"
        aria-label="With value"
      />
      <web-ui-editable-text placeholder="Placeholder shown while empty" aria-label="Empty" />
    </div>
    <p class="mb-3 text-xs text-gray-400">
      💡 Submitting an empty value clears it (Enter or blur); the text layer falls back to the placeholder
    </p>

    <h2>Multiline</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-editable-text
        class="w-80 rounded-sm bg-(--wui-color-surface-raised) p-2"
        :value="multiline"
        placeholder="Multiline placeholder"
        aria-label="Multiline"
      />
    </div>
    <p class="mb-3 text-xs text-gray-400">
      💡 Enter submits instead of inserting a newline; the text layer and the editing layer share one box, so entering
      editing causes no shift
    </p>

    <h2>Disabled</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-editable-text
        value="Disabled with a value: not focusable, no editing"
        disabled
        aria-label="Disabled with value"
      />
      <web-ui-editable-text
        placeholder="Disabled and empty: shows the placeholder"
        disabled
        aria-label="Disabled empty"
      />
    </div>
    <p class="mb-3 text-xs text-gray-400">
      💡 While disabled the host leaves the tab order, and neither pointer nor keyboard enters editing
    </p>

    <h2>Form</h2>
    <form ref="formRef" class="mb-3 flex flex-col items-start gap-3" @submit="handleSubmit" @reset="submitted = []">
      <div class="flex flex-col gap-1">
        <span class="text-sm text-gray-600">Title</span>
        <web-ui-editable-text name="title" value="Initial title" aria-label="Form title" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm text-gray-600">Summary (optional)</span>
        <web-ui-editable-text
          class="w-80 rounded-sm bg-(--wui-color-surface-raised) p-2"
          name="bio"
          placeholder="Enter a summary"
          aria-label="Form summary"
        />
      </div>
      <div class="flex gap-3">
        <!-- web-ui-button 的内部 button 位于 shadow root 内，拿不到外层 form 的 form owner；
             提交与重置由 demo 显式驱动，表单关联仍走原生 submit/reset 事件。 -->
        <web-ui-button @click="formRef?.requestSubmit()">Submit</web-ui-button>
        <web-ui-button variant="secondary" @click="formRef?.reset()">Reset</web-ui-button>
      </div>
    </form>
    <div class="flex flex-col gap-1">
      <span class="text-sm text-gray-500">Submitted value (FormData)</span>
      <span v-if="submitted.length === 0" class="text-sm text-gray-500">(not submitted yet)</span>
      <span v-for="[name, value] in submitted" :key="name" class="text-sm whitespace-pre-wrap text-gray-500">
        {{ name }} = {{ value || '(empty)' }}
      </span>
    </div>
  </div>
</template>
