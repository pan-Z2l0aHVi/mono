<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>

<template>
  <div>
    <h1>空状态</h1>

    <h2>基础</h2>
    <web-ui-empty class="mb-6" title="暂无内容" description="当前区域还没有可展示的内容。"></web-ui-empty>

    <h2>操作</h2>
    <web-ui-empty class="mb-6" title="没有搜索结果" description="请尝试调整筛选条件或搜索关键词。">
      <web-ui-button slot="action" variant="primary">清除筛选</web-ui-button>
    </web-ui-empty>

    <h2>自定义内容</h2>
    <web-ui-empty class="mb-6">
      <web-ui-icon slot="icon" :icon="lucideSearch" :size="28"></web-ui-icon>
      <span>未找到匹配的项目</span>
      <span slot="description">可以使用更短或不同的关键词重新搜索。</span>
      <web-ui-button slot="action" variant="secondary">返回列表</web-ui-button>
    </web-ui-empty>

    <h2>尺寸</h2>
    <div class="grid gap-3">
      <web-ui-empty size="small" title="小尺寸空状态"></web-ui-empty>
      <web-ui-empty size="medium" title="默认尺寸空状态"></web-ui-empty>
      <web-ui-empty size="large" title="大尺寸空状态"></web-ui-empty>
    </div>

    <h2>仅标题</h2>
    <web-ui-empty class="mb-6" title="暂无权限"></web-ui-empty>

    <h2>边界布局</h2>
    <div class="grid gap-3">
      <web-ui-empty><strong>仅使用默认 slot 的标题</strong></web-ui-empty>
      <web-ui-empty
        title="较长内容"
        description="这是一段用于验证长文案布局的中性说明。它不会在容器宽度受限时溢出，而是保持可读的自然换行。"
      ></web-ui-empty>
    </div>
  </div>
</template>
