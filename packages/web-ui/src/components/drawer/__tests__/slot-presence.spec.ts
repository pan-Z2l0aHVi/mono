import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDrawer } from '..'

afterEach(() => document.body.replaceChildren())

function createDrawer(initialHTML = ''): WebUiDrawer {
  const el = document.createElement('web-ui-drawer')
  el.innerHTML = initialHTML
  document.body.append(el)
  return el
}

/**
 * named slot 的内容是否**呈现**在面板里。
 *
 * jsdom 不做布局，因此不能量高度；改用 slot 的 assigned 节点 + 该节自身的 `hidden`
 * 语义判据 —— 判的是「这一节会不会占位」这个用户可见后果，而不是内部 class 名或
 * DOM 层级。空节若不隐藏，就会在面板顶部/底部留下一条空白带，并让相邻内容的
 * 可拖让位量算错。
 */
function sectionState(el: WebUiDrawer, name: 'header' | 'footer'): { assigned: number; hidden: boolean } {
  const slot = el.shadowRoot?.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null
  if (!slot) throw new Error(`Expected the drawer to render a ${name} slot`)
  return {
    assigned: slot.assignedElements().length,
    hidden: slot.parentElement?.hasAttribute('hidden') ?? false
  }
}

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

/** 取某个 named slot 的 assigned 节点 —— 重连后的分配是否跟着新的 light DOM 走。 */
function assigned(el: WebUiDrawer, name: 'header' | 'footer') {
  const slot = el.shadowRoot?.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null
  if (!slot) throw new Error(`Expected the drawer to render a ${name} slot`)
  return slot.assignedElements()
}

describe('WebUiDrawer named-slot presence（jsdom）', () => {
  it('后续插入 header 时该节从隐藏转为呈现', async () => {
    const el = createDrawer()
    await waitForUpdate(el)
    expect(sectionState(el, 'header')).toEqual({ assigned: 0, hidden: true })

    el.insertAdjacentHTML('afterbegin', '<h2 id="title" slot="header">Details</h2>')
    await waitForUpdate(el)

    // 插入了内容却不解除隐藏：标题看不见，面板顶部留一条空白。
    expect(sectionState(el, 'header')).toEqual({ assigned: 1, hidden: false })
    cleanupElement(el)
  })

  it('footer 插入、替换和移除时呈现状态跟随分配', async () => {
    const el = createDrawer()
    await waitForUpdate(el)
    expect(sectionState(el, 'footer')).toEqual({ assigned: 0, hidden: true })

    el.insertAdjacentHTML('beforeend', '<button id="first" slot="footer">Save</button>')
    await waitForUpdate(el)
    expect(sectionState(el, 'footer')).toEqual({ assigned: 1, hidden: false })

    // 换一个内容而不是清空：该节仍应呈现，只换一个节点。
    const first = el.querySelector('#first')!
    const second = document.createElement('button')
    second.id = 'second'
    second.setAttribute('slot', 'footer')
    first.replaceWith(second)
    await waitForUpdate(el)
    expect(sectionState(el, 'footer')).toEqual({ assigned: 1, hidden: false })

    // 内容被移除：占位必须跟着消失，否则底部永久留一条空的点击带。
    el.querySelector('#second')!.remove()
    await waitForUpdate(el)
    expect(sectionState(el, 'footer')).toEqual({ assigned: 0, hidden: true })
    cleanupElement(el)
  })

  it('断开期间替换 header/footer，重连后按新内容呈现', async () => {
    const el = createDrawer(`
      <h2 id="old-title" slot="header">Old</h2>
      <button id="old-action" slot="footer">Old</button>
    `)
    await waitForUpdate(el)
    expect(sectionState(el, 'header').assigned).toBe(1)
    expect(sectionState(el, 'footer').assigned).toBe(1)

    el.remove()

    const newTitle = document.createElement('h2')
    newTitle.id = 'new-title'
    newTitle.setAttribute('slot', 'header')
    newTitle.textContent = 'New'
    el.querySelector('#old-title')!.replaceWith(newTitle)

    const newAction = document.createElement('button')
    newAction.id = 'new-action'
    newAction.setAttribute('slot', 'footer')
    el.querySelector('#old-action')!.replaceWith(newAction)

    document.body.append(el)
    await flush()
    await waitForUpdate(el)

    // 重连后分配必须跟着新的 light DOM 走：留在旧内容上，用户会看到换掉的标题没生效。
    expect(assigned(el, 'header')[0].id).toBe('new-title')
    expect(assigned(el, 'footer')[0].id).toBe('new-action')
    cleanupElement(el)
  })

  /*
   * 断连期间清空 slot 内容：重连后该节必须重新隐藏。
   *
   * 缺陷形态（真实浏览器与 jsdom 皆复现）：`connectedCallback` 重算了 `_hasHeaderSlot` /
   * `_hasFooterSlot`，却没排更新。Lit 的 `connectedCallback` 只做 `enableUpdating(true)`
   * 与 `setConnected(true)`，本身不排更新；而 slotchange 只在**分配集合**变化时派发，
   * 断连期间清空的是槽位内容的有无、宿主节点本身没动，于是两条处理器也不触发。
   * `?hidden` 因此停在断连前的取值。
   *
   * 判据只钉用户后果——那一节重新 `hidden`：空节在 style.css 的 padding 下仍有真实高度，
   * 成为一条点不动的死带，拖拽热区的让位量也按它算。
   *
   * assigned 只作前置观察、不能单独承重：分配是浏览器直给的，与组件要不要请求更新
   * 无关，只断言它时本缺陷下照样绿。
   */
  it('断开期间清空 footer 内容，重连后 footer 重新隐藏', async () => {
    const el = createDrawer('<button id="save" slot="footer">Save</button>')
    await waitForUpdate(el)
    expect(sectionState(el, 'footer').hidden).toBe(false)

    el.remove()
    el.querySelector('#save')!.remove()
    document.body.append(el)
    await waitForUpdate(el)

    expect(sectionState(el, 'footer')).toEqual({ assigned: 0, hidden: true })
  })

  it('断开期间清空 header 内容，重连后 header 重新隐藏', async () => {
    // 不给 heading：`showHeader` 退化成只看 `_hasHeaderSlot`，否则 heading 会把这一节
    // 撑住，重连后的可见与否就分不清是 presence 失效还是本该如此。
    const el = createDrawer('<h2 id="title" slot="header">Details</h2>')
    await waitForUpdate(el)
    expect(sectionState(el, 'header').hidden).toBe(false)

    el.remove()
    el.querySelector('#title')!.remove()
    document.body.append(el)
    await waitForUpdate(el)

    expect(sectionState(el, 'header')).toEqual({ assigned: 0, hidden: true })
  })
})
