<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent, WebUiSelect } from '@greypan/web-ui'
import { ref } from 'vue'

// v-model 绑定：value 即输入文本，选中时回填为 option label
const text = ref('')
const changeValue = ref('')
const changeSelectedValue = ref('')
const customValue = ref('')
const customSelectedValue = ref('')

function handleChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  changeValue.value = event.currentTarget.value
  changeSelectedValue.value = event.currentTarget.selectedValue
}

function handleCustomChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  customValue.value = event.currentTarget.value
  customSelectedValue.value = event.currentTarget.selectedValue
}

// 自定义 trigger slot：多行 textarea trigger 保留 Enter 换行，Escape/blur 关闭 panel
const multilineText = ref('')
const multilineCommit = ref({ value: '', selectedValue: '' })
const multilineTrigger = ref<WebUiAutocomplete>()

function handleMultilineInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  multilineText.value = event.currentTarget.value
}

function handleMultilineChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  multilineCommit.value = {
    value: event.currentTarget.value,
    selectedValue: event.currentTarget.selectedValue
  }
}

// 公共 focus() 委托给当前生效 trigger：这里是 light DOM 的 web-ui-textarea
function focusMultilineTrigger() {
  multilineTrigger.value?.focus()
}

// 单行自定义 trigger 保持默认 Enter 语义：panel 打开时 Enter 选择高亮项
const singleLineText = ref('')

function handleSingleLineInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  singleLineText.value = event.currentTarget.value
}

// selected-value 由当前输入派生：文本不再精确匹配任何 option label 时自动清空
const liveInput = ref('')
const liveSelectedValue = ref('')

function handleInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  const host = event.currentTarget
  liveInput.value = host.value
  // selected-value 在组件的 update cycle 中派生，延迟一拍读取最终值
  requestAnimationFrame(() => {
    liveSelectedValue.value = host.selectedValue
  })
}

const filterMode = ref<'contains' | 'prefix' | 'none'>('contains')

function handleFilterChange(event: WebUiEvent<WebUiSelect, 'change'>) {
  filterMode.value = event.currentTarget.value as 'contains' | 'prefix' | 'none'
}

const frameworks = ['Vue', 'React', 'Svelte', 'Angular', 'Solid', 'Preact', 'Lit']

const cities = [
  'Beijing',
  'Shanghai',
  'Guangzhou',
  'Qingdao',
  'Hangzhou',
  'Chengdu',
  'Wuhan',
  'Xian',
  'Nanjing',
  'Suzhou'
]
</script>

<template>
  <div>
    <h1>Autocomplete</h1>

    <h2>Basic</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      键入时按 label 过滤候选（默认
      <code>contains</code>），选择后文本回填为 option label。
    </p>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete placeholder="input name">
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
    </div>

    <h2>Borderless</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete borderless placeholder="Borderless autocomplete">
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
      <web-ui-autocomplete borderless value="Vue" placeholder="Borderless with value">
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
    </div>

    <h2>v-model binding</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete v-model="text" placeholder="Enter a city name">
        <web-ui-option v-for="city in cities" :key="city" :value="city" :label="city">{{ city }}</web-ui-option>
      </web-ui-autocomplete>
      <div>当前输入：{{ text || 'None' }}</div>
    </div>

    <h2>filter mode</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      <code>contains</code>Contains match,<code>prefix</code>Prefix match,<code>none</code>
      关闭过滤。
    </p>
    <div class="mb-3 flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <web-ui-select
          :value="filterMode"
          aria-label="Filter mode"
          class="[--wui-input-width:140px]"
          @change="handleFilterChange"
        >
          <web-ui-option value="contains" label="Contains"></web-ui-option>
          <web-ui-option value="prefix" label="Prefix"></web-ui-option>
          <web-ui-option value="none" label="No filter"></web-ui-option>
        </web-ui-select>
        <span class="text-sm text-(--wui-color-text-secondary)">当前模式：{{ filterMode }}</span>
      </div>
      <web-ui-autocomplete :filter="filterMode" placeholder="input name">
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
    </div>

    <h2>change event</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      选择提交时触发 <code>change</code>；<code>selected-value</code> 由当前输入派生，输入不再 精确匹配任何 option label
      时自动清空。
    </p>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete placeholder="Select a city" @input="handleInput" @change="handleChange">
        <web-ui-option v-for="city in cities" :key="city" :value="city" :label="city">{{ city }}</web-ui-option>
      </web-ui-autocomplete>
      <div>实时输入：{{ liveInput || 'None' }}</div>
      <div>实时 selected-value：{{ liveSelectedValue || 'None' }}</div>
      <div>最近 change 文本：{{ changeValue || 'None' }}</div>
      <div>最近 change selected-value：{{ changeSelectedValue || 'None' }}</div>
    </div>

    <h2>Disabled option</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete placeholder="Partially disabled">
        <web-ui-option value="vue" label="Vue"></web-ui-option>
        <web-ui-option value="react" label="React" disabled></web-ui-option>
        <web-ui-option value="svelte" label="Svelte"></web-ui-option>
        <web-ui-option value="angular" label="Angular" disabled></web-ui-option>
      </web-ui-autocomplete>
    </div>

    <h2>custom value</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      On
      <code>allow-custom-value</code> and type text that matches no option, then press Enter to submit it; then
      <code>selected-value</code> 为空。零匹配时 panel 保持关闭，按 Enter 仍会提交该文本。
    </p>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete allow-custom-value placeholder="Existing input or new label" @change="handleCustomChange">
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
      <div>最近提交 value：{{ customValue || 'None' }}</div>
      <div>最近提交 selected-value：{{ customSelectedValue || 'None' }}</div>
    </div>

    <h2>Custom trigger</h2>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      Through<code>slot="trigger"</code>Replace the default input with an editable component. A multiline trigger
      (<code>web-ui-textarea</code>）保留 Enter 换行：Enter 不选择高亮项，panel 用 Escape 或 blur 关闭；panel 打开时
      ArrowUp/ArrowDown 移动文本光标。选中候选仍会把 label 回填到 trigger。
    </p>

    <h3>Multiline text trigger</h3>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete
        ref="multilineTrigger"
        placeholder="input name"
        @input="handleMultilineInput"
        @change="handleMultilineChange"
      >
        <web-ui-textarea
          slot="trigger"
          :rows="3"
          class="[--wui-textarea-width:20rem]"
          placeholder="Multiline input: type to filter the options, Enter inserts a newline"
        />
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
      <div class="flex flex-wrap items-center gap-3">
        <web-ui-button variant="secondary" size="28" @click="focusMultilineTrigger">Focus the trigger</web-ui-button>
        <span class="text-sm text-(--wui-color-text-secondary)"
          >The public focus() delegates to the current trigger</span
        >
      </div>
      <div>Current text (newlines render as typed):</div>
      <div class="whitespace-pre-wrap text-sm">{{ multilineText || 'None' }}</div>
      <div>最近 change 文本：{{ multilineCommit.value || 'None' }}</div>
      <div>最近 change selected-value：{{ multilineCommit.selectedValue || 'None' }}</div>
    </div>

    <h3>Single-line input trigger</h3>
    <p class="mb-2 text-sm text-(--wui-color-text-secondary)">
      单行自定义 trigger 保持默认 Enter 行为：panel 打开时 Enter 选择高亮项。
    </p>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete placeholder="input name" @input="handleSingleLineInput">
        <web-ui-input slot="trigger" placeholder="Single-line input: Enter selects the highlighted option" />
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
      <div>当前文本：{{ singleLineText || 'None' }}</div>
    </div>

    <h2>Portal</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete portal placeholder="Portal autocomplete">
        <web-ui-option v-for="city in cities" :key="city" :value="city" :label="city">{{ city }}</web-ui-option>
      </web-ui-autocomplete>
    </div>

    <h2>No scroll lock</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete no-scroll-lock placeholder="Page scroll is not locked while open">
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
    </div>

    <h2>Required</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete required placeholder="Required, validation fails when empty">
        <web-ui-option v-for="city in cities" :key="city" :value="city" :label="city">{{ city }}</web-ui-option>
      </web-ui-autocomplete>
    </div>

    <h2>Disabled</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete value="Vue" placeholder="Disabled" disabled>
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
    </div>

    <h2>Read only</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-autocomplete value="Vue" placeholder="Read only" readonly>
        <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name">{{ name }}</web-ui-option>
      </web-ui-autocomplete>
    </div>
  </div>
</template>
