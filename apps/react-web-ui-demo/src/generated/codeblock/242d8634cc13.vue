<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Collapsed initially
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">No open binding: on a trigger click the component writes the property itself.</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Expanded initially
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">
            It carries open at mount and lands directly in the expanded resting state; only the next click plays the
            exit animation.
          </p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>
