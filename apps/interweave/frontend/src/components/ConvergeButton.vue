<script setup lang="ts">
/*
 * 带「悬停收拢」反馈的按钮封装。
 *
 * 适合带方向暗示的跳转箭头类按钮（如「找回资源 →」）；状态图标（勾选、计数等）不适合用这个
 * 效果，保持普通 web-ui-button。
 *
 * 单侧插槽时文字朝该侧移动、图标反向移动；两侧都有时文字不动，两个图标各向中间移动。
 * disabled / loading 时不产生位移。距离与过渡按 web-ui 的 motion 契约处理，同时认系统
 * prefers-reduced-motion 与 <web-ui-theme motion="reduced">。
 *
 * prefix / suffix 与文案都包一层 span：裸文本节点不能加 translate，而 slot 内容由父组件编译，
 * 本组件的 scoped CSS 够不到；包一层之后，参与动画的元素都归本组件所有。
 */
</script>

<template>
  <web-ui-button
    class="converge-button"
    :data-converge="$slots.prefix ? ($slots.suffix ? 'both' : 'prefix') : $slots.suffix ? 'suffix' : undefined"
  >
    <span v-if="$slots.prefix" slot="prefix" class="converge-prefix"><slot name="prefix" /></span>
    <span class="converge-label"><slot /></span>
    <span v-if="$slots.suffix" slot="suffix" class="converge-suffix"><slot name="suffix" /></span>
  </web-ui-button>
</template>

<style scoped>
.converge-button {
  /* 默认间距 8px，两侧各收 3px 后剩约 2px。 */
  --converge-distance: var(--interweave-converge-distance, 3px);
}

.converge-button[data-converge='prefix'] {
  --converge-label-x: calc(var(--converge-distance) * -1);
  --converge-prefix-x: var(--converge-distance);
}

.converge-button[data-converge='suffix'] {
  --converge-label-x: var(--converge-distance);
  --converge-suffix-x: calc(var(--converge-distance) * -1);
}

.converge-button[data-converge='both'] {
  --converge-prefix-x: var(--converge-distance);
  --converge-suffix-x: calc(var(--converge-distance) * -1);
}

.converge-label,
.converge-prefix,
.converge-suffix {
  transition: translate var(--interweave-converge-duration, 150ms) var(--wui-ease-enter, cubic-bezier(0.23, 1, 0.32, 1));
}

.converge-label {
  display: inline-block;
}

.converge-prefix,
.converge-suffix {
  display: inline-flex;
  align-items: center;
}

@media (hover: hover) and (pointer: fine) {
  .converge-button:not([disabled], [loading]):hover .converge-label {
    translate: var(--converge-label-x, 0) 0;
  }

  .converge-button:not([disabled], [loading]):hover .converge-prefix {
    translate: var(--converge-prefix-x, 0) 0;
  }

  .converge-button:not([disabled], [loading]):hover .converge-suffix {
    translate: var(--converge-suffix-x, 0) 0;
  }
}

/*
 * reduced motion 下不位移、也不过渡。系统偏好由媒体查询表达；应用内开关由
 * global.css 把距离与过渡时长的 token 一并归零。
 */
@media (prefers-reduced-motion: reduce) {
  .converge-button {
    --converge-distance: 0px;
  }

  .converge-label,
  .converge-prefix,
  .converge-suffix {
    transition: none;
  }
}
</style>
