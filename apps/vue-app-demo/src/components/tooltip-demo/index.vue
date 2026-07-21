<script setup lang="ts"></script>

<template>
  <div>
    <h1>工具提示</h1>
    <h2>上方</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-tooltip content="这是提示文字">
        <web-ui-button>上方</web-ui-button>
      </web-ui-tooltip>
    </div>

    <h2>下方</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-tooltip placement="bottom" content="底部提示">
        <web-ui-button>下方</web-ui-button>
      </web-ui-tooltip>
    </div>

    <h2>左侧</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-tooltip placement="left" content="左侧提示">
        <web-ui-button>左侧</web-ui-button>
      </web-ui-tooltip>
    </div>

    <h2>右侧</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-tooltip placement="right" content="右侧提示">
        <web-ui-button>右侧</web-ui-button>
      </web-ui-tooltip>
    </div>

    <h2>富内容插槽</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-tooltip placement="bottom">
        <web-ui-button>自定义内容</web-ui-button>
        <div slot="content"><span class="font-semibold">富文本</span> 提示内容</div>
      </web-ui-tooltip>
    </div>

    <h2>延迟</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-tooltip content="延迟 500ms 显示" :show-delay="500">
        <web-ui-button>长延迟</web-ui-button>
      </web-ui-tooltip>
    </div>

    <h2>禁用</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-tooltip content="禁用时不显示" disabled>
        <web-ui-button>禁用</web-ui-button>
      </web-ui-tooltip>
    </div>
  </div>
</template>
