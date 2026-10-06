import { onScopeDispose, readonly, ref, type DeepReadonly, type Ref } from 'vue'

/**
 * matchMedia 的响应式封装：读一次初值，之后跟随查询变化。
 *
 * 断点必须与 `web-ui-layout` 内部的移动端判定（`window.innerWidth <= 640`）对齐，
 * 否则页面自身的布局分支会和 layout 切换桌面/抽屉的时机错开，中间出现半拍错位。
 */
export function useMediaQuery(query: string): DeepReadonly<Ref<boolean>> {
  const mediaQuery = window.matchMedia(query)
  const matches = ref(mediaQuery.matches)

  function sync() {
    matches.value = mediaQuery.matches
  }

  mediaQuery.addEventListener('change', sync)
  onScopeDispose(() => mediaQuery.removeEventListener('change', sync))

  return readonly(matches)
}
