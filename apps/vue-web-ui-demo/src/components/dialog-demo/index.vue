<script setup lang="ts">
import { ref } from 'vue'

const dialogRef = ref<HTMLDialogElement>()

const visible1 = ref(false)
const visible2 = ref(false)
const visible3 = ref(false)
const visible4 = ref(false)
const visible5 = ref(false)
const bgVisible = ref(false)
</script>

<template>
  <div>
    <h1>dialog</h1>

    <h2>Imperative</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="dialogRef?.showModal()">Open a dialog</web-ui-button>
    </div>

    <web-ui-dialog ref="dialogRef">
      <span slot="header">Save this message as a draft?</span>
      This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
      <web-ui-button slot="footer" variant="primary" full>Save</web-ui-button>
      <web-ui-button slot="footer" variant="danger" full>Don't Save</web-ui-button>
      <web-ui-button slot="footer" variant="secondary" full @click="dialogRef?.close()">Cancel</web-ui-button>
    </web-ui-dialog>

    <h2>Declarative</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible1 = true">Open a dialog</web-ui-button>
    </div>

    <web-ui-dialog :open="visible1" @open-change="visible1 = $event.detail.open">
      <span slot="header">Save this message as a draft?</span>
      This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
      <web-ui-button slot="footer" variant="primary" full>Save</web-ui-button>
      <web-ui-button slot="footer" variant="danger" full>Don't Save</web-ui-button>
      <web-ui-button slot="footer" variant="secondary" full @click="visible1 = false">Cancel</web-ui-button>
    </web-ui-dialog>

    <h2>Scroll lock</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible3 = true">Open a dialog without scroll lock</web-ui-button>
    </div>
    <web-ui-dialog :open="visible3" no-scroll-lock @open-change="visible3 = $event.detail.open">
      <span slot="header">Scrollable background</span>
      此 dialog 关闭滚动锁定，仍保留原生模态焦点行为。
      <web-ui-button slot="footer" variant="secondary" full @click="visible3 = false">Close</web-ui-button>
    </web-ui-dialog>

    <h2>Horizontal button</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible2 = true">Open a horizontal dialog</web-ui-button>
    </div>

    <web-ui-dialog :open="visible2" horizontal @open-change="visible2 = $event.detail.open">
      <span slot="header">Save this message as a draft?</span>
      This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
      <web-ui-button slot="footer" variant="secondary" full @click="visible2 = false">Cancel</web-ui-button>
      <web-ui-button slot="footer" variant="primary" full>Save</web-ui-button>
    </web-ui-dialog>

    <h2>Custom content (headless)</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible4 = true">Open a custom dialog</web-ui-button>
    </div>

    <web-ui-dialog headless dialog-label="Custom dialog" :open="visible4" @open-change="visible4 = $event.detail.open">
      <div style="text-align: center">
        <p style="margin: 0; font-size: 48px">🎉</p>
        <p style="margin: 12px 0 4px; font-size: 18px; font-weight: 600">Done</p>
        <p style="margin: 0 0 20px; color: #6a6a6a">
          headless: the content goes through the default slot; the overlay infrastructure stays and the built-in chrome
          is dropped.
        </p>
        <web-ui-button variant="primary" full @click="visible4 = false">Got it</web-ui-button>
      </div>
    </web-ui-dialog>

    <h2>Backdrop click does not close</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible5 = true">Open</web-ui-button>
    </div>

    <web-ui-dialog :open="visible5" no-backdrop-close @open-change="visible5 = $event.detail.open">
      <span slot="header">Confirm</span>
      <p>This dialog does not close on a backdrop click; use the button instead.</p>
      <web-ui-button slot="footer" variant="primary" full @click="visible5 = false">Confirm</web-ui-button>
      <web-ui-button slot="footer" variant="secondary" full @click="visible5 = false">Cancel</web-ui-button>
    </web-ui-dialog>

    <h2>Custom background color</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="bgVisible = true">Open a dialog</web-ui-button>
    </div>
    <web-ui-dialog
      :open="bgVisible"
      @open-change="bgVisible = $event.detail.open"
      style="--wui-dialog-bg: rgb(240 248 255 / 0.92)"
    >
      <span slot="header">Custom background color</span>
      <p>Through<code>--wui-dialog-bg</code>CSS custom properties override the glass card background.</p>
      <web-ui-button slot="footer" variant="primary" full @click="bgVisible = false">OK</web-ui-button>
    </web-ui-dialog>
  </div>
</template>
