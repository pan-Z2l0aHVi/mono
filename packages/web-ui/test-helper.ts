import { afterEach, vi } from 'vite-plus/test'

// jsdom does not implement scrolling; tests assert the surrounding lock state.
vi.stubGlobal('scrollTo', vi.fn())

// jsdom omits Element#scrollTo; BackTop only needs the public scrolling call.
Object.defineProperty(Element.prototype, 'scrollTo', {
  configurable: true,
  value: vi.fn()
})

// Keep fixture/timer ownership explicit: remove leaked light-DOM trees and make
// an unbalanced useFakeTimers in one test impossible to leak into the next.
afterEach(() => {
  document.body.replaceChildren()
  vi.useRealTimers()
})

// NOTE: 这里**故意不**给 jsdom 补 `HTMLDialogElement.prototype.showModal` / `close`。
//
// 共享的 `native-dialog-presence` 用 `dialog.showModal?.()` 防御性调用：jsdom 下这两个方法
// 不存在，调用被跳过，组件的 jsdom 用例据此断言「没有 top layer 语义」的既有行为。
// 一旦在全局补上，`?.()` 就会真的执行，`image-preview` 等用例的观察点随之改变而变红。
//
// 需要 modal dialog 的 spec 应在自己的文件顶部局部补齐（既有做法见
// `shared/overlay/__tests__/native-dialog-presence.spec.ts`），不要提升为全局 shim。
