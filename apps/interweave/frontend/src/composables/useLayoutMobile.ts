import type { WebUiEvent, WebUiLayout } from '@greypan/web-ui'
import { inject, provide, readonly, ref, type DeepReadonly, type InjectionKey, type Ref } from 'vue'

/*
 * 移动端判定由 `web-ui-layout` 独占：它同时决定渲染哪一套树（桌面 aside / 移动端 drawer），
 * 对外以 `mobile` 属性与 `mobile-change` 事件暴露同一时刻的值。应用壳只做接线，页面只做读取——
 * app 侧不再出现断点常量，也不会出现「壳已按移动端排版、layout 却还在桌面树」的半拍错位
 * （issue #195 里三份断点判断各自踩坑的根因）。
 */
const layoutMobileKey: InjectionKey<DeepReadonly<Ref<boolean>>> = Symbol('layout-mobile')

export interface LayoutMobileProvider {
  /** 壳自己也要用（sidebar 宽度、折叠闸门），与页面拿到的是同一个只读来源。 */
  mobile: DeepReadonly<Ref<boolean>>
  /** 绑到 `<web-ui-layout @mobile-change>`：初值与每次跨断点都由 layout 给出。 */
  onMobileChange: (event: WebUiEvent<WebUiLayout, 'mobile-change'>) => void
}

/**
 * 应用壳用：接住 layout 的移动端状态并向下 provide。
 * 必须在 setup 里调用（provide 只在组件初始化阶段生效）。
 */
export function useLayoutMobileProvider(): LayoutMobileProvider {
  const mobile = ref(false)
  const exposed = readonly(mobile)
  provide(layoutMobileKey, exposed)

  return {
    mobile: exposed,
    onMobileChange(event) {
      mobile.value = event.detail.mobile
    }
  }
}

/**
 * 页面用：取最近的应用壳提供的移动端状态。
 * 壳之外挂载（单组件测试、独立路由）时回落为桌面端，与 layout 在无匹配视口下的取值一致。
 */
export function useLayoutMobile(): DeepReadonly<Ref<boolean>> {
  return inject(layoutMobileKey, readonly(ref(false)))
}
