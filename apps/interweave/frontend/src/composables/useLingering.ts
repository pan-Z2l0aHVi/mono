import { ref, watch, type Ref } from 'vue'

/**
 * 弹层退场期间保留上一次内容：只翻 `open`，不清已渲染的内容。
 *
 * 关闭后组件还要播完退场动画，这段时间弹窗仍然可见。若调用方在关掉的同一帧把内容置空，
 * 标题、说明与按钮文案会瞬间塌掉（实测紧凑确认框单帧掉 61.6px，宽度还会从标题派生的
 * 320px 跳回默认值）。因此内容只在拿到新的非空值时替换，退场期间继续渲染上一份。
 *
 * 适用于 DetailDrawer、DuplicateConfirmDialog、RestoreDialog 这类「关掉后仍要渲染一帧」的弹层。
 */
export function useLingering<T>(source: Ref<T | null | undefined> | (() => T | null | undefined)): Ref<T | null> {
  const read = typeof source === 'function' ? source : () => source.value
  const value = ref<T | null>(null) as Ref<T | null>
  watch(
    read,
    next => {
      if (next) value.value = next
    },
    { immediate: true }
  )
  return value
}
