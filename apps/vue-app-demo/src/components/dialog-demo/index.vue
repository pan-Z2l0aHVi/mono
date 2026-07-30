<script setup lang="ts">
import { ref } from 'vue'

// 命令式
const dialogRef = ref<HTMLDialogElement>()

// 声明式
const visible1 = ref(false)
const visible2 = ref(false)
const visible3 = ref(false)
const visible4 = ref(false)
const visible5 = ref(false)
</script>

<template>
  <div>
    <h1>对话框</h1>

    <h2>命令式</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="dialogRef?.showModal()">打开对话框</web-ui-button>
    </div>

    <web-ui-dialog ref="dialogRef">
      <span slot="title">Save this message as a draft?</span>
      This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
      <web-ui-button slot="footer" variant="primary" full>Save</web-ui-button>
      <web-ui-button slot="footer" variant="danger" full>Don't Save</web-ui-button>
      <web-ui-button slot="footer" variant="secondary" full @click="dialogRef?.close()">Cancel</web-ui-button>
    </web-ui-dialog>

    <h2>声明式</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible1 = true">打开对话框</web-ui-button>
    </div>

    <web-ui-dialog :open="visible1" @open-change="visible1 = $event.detail.open">
      <span slot="title">Save this message as a draft?</span>
      This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
      <web-ui-button slot="footer" variant="primary" full>Save</web-ui-button>
      <web-ui-button slot="footer" variant="danger" full>Don't Save</web-ui-button>
      <web-ui-button slot="footer" variant="secondary" full @click="visible1 = false">Cancel</web-ui-button>
    </web-ui-dialog>

    <h2>滚动锁定</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible3 = true">打开不锁定滚动的对话框</web-ui-button>
    </div>
    <web-ui-dialog :open="visible3" :lock-scroll="false" @open-change="visible3 = $event.detail.open">
      <span slot="title">可滚动背景</span>
      此对话框关闭滚动锁定，仍保留原生模态焦点行为。
      <web-ui-button slot="footer" variant="secondary" full @click="visible3 = false">关闭</web-ui-button>
    </web-ui-dialog>

    <h2>横向按钮</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible2 = true">打开横向对话框</web-ui-button>
    </div>

    <web-ui-dialog :open="visible2" horizontal @open-change="visible2 = $event.detail.open">
      <span slot="title">Save this message as a draft?</span>
      This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
      <web-ui-button slot="footer" variant="secondary" full @click="visible2 = false">Cancel</web-ui-button>
      <web-ui-button slot="footer" variant="primary" full>Save</web-ui-button>
    </web-ui-dialog>

    <h2>自定义内容（body slot）</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible4 = true">打开自定义对话框</web-ui-button>
    </div>

    <web-ui-dialog :open="visible4" @open-change="visible4 = $event.detail.open">
      <div slot="body" style="text-align: center">
        <p style="margin: 0; font-size: 48px">🎉</p>
        <p style="margin: 12px 0 4px; font-size: 18px; font-weight: 600">操作成功</p>
        <p style="margin: 0 0 20px; color: #6a6a6a">自定义 body slot 内容，保留玻璃卡片外壳。</p>
        <web-ui-button variant="primary" full @click="visible4 = false">知道了</web-ui-button>
      </div>
    </web-ui-dialog>

    <h2>不可点击遮罩关闭</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible5 = true">打开</web-ui-button>
    </div>

    <web-ui-dialog :open="visible5" :overlay-closable="false" @open-change="visible5 = $event.detail.open">
      <span slot="title">确认操作</span>
      <p>此对话框禁止点击遮罩关闭，必须通过按钮操作。</p>
      <web-ui-button slot="footer" variant="primary" full @click="visible5 = false">确认</web-ui-button>
      <web-ui-button slot="footer" variant="secondary" full @click="visible5 = false">取消</web-ui-button>
    </web-ui-dialog>
  </div>
</template>
