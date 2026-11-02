<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-checkbox :checked="disabled" @change="disabled = $event.target.checked">
      Disable the trigger of the first one
    </web-ui-checkbox>

    <web-ui-collapse :disabled="disabled">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Disabled with the checkbox
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          Uncheck to expand; once checked it does not react to clicks, but the content of this one was not expanded to
          begin with.
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true" disabled>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Expanded and disabled
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          Disabling does not collapse expanded content: this one stays visible and trigger clicks have no effect.
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const disabled = ref(true)
</script>
