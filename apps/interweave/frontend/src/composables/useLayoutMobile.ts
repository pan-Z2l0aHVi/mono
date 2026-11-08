import { inject, onScopeDispose, provide, readonly, ref, type DeepReadonly, type InjectionKey, type Ref } from 'vue'

const layoutMobileKey: InjectionKey<DeepReadonly<Ref<boolean>>> = Symbol('layout-mobile')

/** 应用壳按视口维护移动端状态，并提供给页面。 */
export function useLayoutMobileProvider() {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia('(width <= 640px)') : null
  const mobile = ref(query?.matches ?? false)
  const onChange = (event: MediaQueryListEvent) => {
    mobile.value = event.matches
  }
  query?.addEventListener('change', onChange)
  onScopeDispose(() => query?.removeEventListener('change', onChange))
  const exposed = readonly(mobile)
  provide(layoutMobileKey, exposed)
  return { mobile: exposed }
}

/** 页面读取应用壳的移动端状态。 */
export function useLayoutMobile(): DeepReadonly<Ref<boolean>> {
  return inject(layoutMobileKey, readonly(ref(false)))
}
