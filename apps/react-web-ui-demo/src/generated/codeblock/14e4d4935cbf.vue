<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        初始收起
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">没有绑定 open：点 trigger 由组件自己把属性写到位。</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        初始展开
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">挂载时就带 open，直接落展开稳态；再点一次才走收起动画。</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>
