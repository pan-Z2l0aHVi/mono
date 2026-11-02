<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="outer" @open-change="onOuterChange">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Outer collapse
      </button>
      <div slot="content">
        <div class="p-3">
          <p class="m-0 mb-2 text-sm">Outer content, with another one nested inside.</p>
          <web-ui-collapse :open="inner" @open-change="inner = $event.detail.open">
            <button
              type="button"
              class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-raised) px-3 py-2 text-left"
            >
              Inner collapse
            </button>
            <div slot="content">
              <div class="p-3 text-sm">
                Expanding the inner one makes the outer one taller; each level holds its own open.
              </div>
            </div>
          </web-ui-collapse>
        </div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">outer {{ outer }} · inner {{ inner }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const outer = ref(false)
const inner = ref(false)

function onOuterChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  // The inner open-change bubbles through the outer host: only accept the one dispatched to this element.
  if (event.target === event.currentTarget) outer.value = event.detail.open
}
</script>
