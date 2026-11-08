import { onScopeDispose, readonly, ref } from 'vue'

const mobile = ref(false)
let query: MediaQueryList | null = null
let subscribers = 0
const onChange = (event: MediaQueryListEvent) => {
  mobile.value = event.matches
}

/** 应用共享视口状态；最后一个调用方卸载时移除监听。 */
export function useMobile() {
  if (subscribers++ === 0 && typeof window.matchMedia === 'function') {
    query = window.matchMedia('(width <= 640px)')
    mobile.value = query.matches
    query.addEventListener('change', onChange)
  }
  onScopeDispose(() => {
    if (--subscribers === 0) {
      query?.removeEventListener('change', onChange)
      query = null
    }
  })
  return readonly(mobile)
}
