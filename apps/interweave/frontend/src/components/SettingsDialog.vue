<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { lucideX } from '@greypan/web-ui/icons'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}
</script>

<template>
  <!--
    controlled：open 的唯一真相在宿主。Escape 与遮罩点击因此只派发关闭请求，由宿主回写 open
    才走退出动画——否则组件自行改 open，而 Vue 侧的 vdom 仍认为它是 true，两边就此分叉。

    挂载点是 AppLayout 里 web-ui-layout 的同级节点，不进它的 light DOM：未分配到任何 slot
    的 light 子节点在 shadow DOM 宿主下没有盒子，放进去反而不会渲染。侧边栏（含 ≤640px
    的抽屉）是 web-ui-layout 内部的子树，原生 dialog 提升进 top layer 后不受其 overflow、
    transform 与 aside 的 display:none 影响。
  -->
  <web-ui-dialog :open="open" controlled class="[--wui-dialog-width:min(90vw,420px)]" @open-change="handleOpenChange">
    <div slot="title" class="flex items-center justify-between gap-4">
      <span>设置</span>
      <web-ui-button icon variant="ghost" size="28" aria-label="关闭设置" @click="emit('update:open', false)">
        <web-ui-icon :icon="lucideX" :size="14" />
      </web-ui-button>
    </div>

    <!--
      本轮只留空状态占位：min-height 归零让内容按实际高度排（web-ui-empty 默认把它顶对齐在
      240px min-block-size 盒内，在 dialog 里会凭空多出一段空白），padding 同样归零后由
      dialog 的 desc 边距提供留白。
    -->
    <web-ui-empty description="尚未实现" :size="72" class="[--wui-empty-min-height:0] [--wui-empty-padding:0]" />

    <web-ui-button slot="footer" variant="secondary" @click="emit('update:open', false)">关闭</web-ui-button>
  </web-ui-dialog>
</template>
