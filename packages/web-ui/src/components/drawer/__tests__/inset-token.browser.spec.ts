import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDrawer } from '..'

function getDialog(el: WebUiDrawer): HTMLDialogElement {
  return el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
}

function createDrawer(): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  document.body.appendChild(el)
  return el
}

afterEach(() => document.body.replaceChildren())

/*
 * `--wui-drawer-inset` 是 README / README.CN 双边文档化的公开 token：默认 8px，
 * 置 0 为贴边几何。组件把它注册成 `<length>`（index.ts 的 `CSS.registerProperty`），
 * 因此 Consumer 写 unitless 的 `0` 会在计算值阶段归一成 `0px`；不注册的话
 * `calc(100% + 0)` 因 number 与 percentage 不兼容而整条闭合 transform 失效，
 * 抽屉就滑不出视口。
 *
 * 读的是 token 归一化的结果，不是组件的内部样式取值：前者是 README 承诺给 Consumer
 * 的行为，后者才是 §12 C1 排除的几何。判据见 §14 T1。
 *
 * 区分力已实测（review fixup）：把 `CSS.registerProperty` 里的 name 改掉后本例变红
 * （`expected '0' to be '0px'`）。同一轮还试过「置 0 后开合仍触发 transform 过渡」
 * 这条行为级写法，注入同一缺陷**仍然绿**——transform 失效后 `none → translate(0,0)`
 * 照样产生一条过渡，所以行为面在这里没有区分力，按 §13 C8 弃用，只保留 token 面。
 */
describe('WebUiDrawer 公开 token --wui-drawer-inset（浏览器）', () => {
  it('unitless 0 在计算值阶段归一为 0px', async () => {
    const el = createDrawer()
    el.style.setProperty('--wui-drawer-inset', '0')
    el.open = true
    await el.updateComplete

    const dialog = getDialog(el)
    await expect.poll(() => dialog.open).toBe(true)

    expect(getComputedStyle(dialog).getPropertyValue('--wui-drawer-inset').trim()).toBe('0px')
  })
})
