import { afterEach, describe, expect, it } from 'vite-plus/test'

import { defineOverlayPortal, resolveOverlayContainer } from '../portal'

afterEach(() => {
  document.body.replaceChildren()
})

/*
 * Portal 承担两件对用户可见的事：**面板挂到哪里**（决定它能否留在 top layer 内、
 * 是否被下层浮层抢走命中）与**内容在关闭后去哪**（必须回到原组件，否则内容直接消失）。
 *
 * 容器解析的判据是「显式容器优先」这一条规则本身，不锁属性名与 DOM 形状；
 * 迁移的判据是内容最终回到原宿主，不锁面板内部结构。
 */
describe('浮层 Portal', () => {
  it('显式容器优先于主题和 fallback root', () => {
    const target = document.createElement('div')
    const container = document.createElement('div')
    document.body.append(target, container)

    expect(resolveOverlayContainer(container, target)).toBe(container)
  })

  it('内容迁入面板，销毁前恢复到原组件', () => {
    const target = document.createElement('div')
    const content = document.createElement('button')
    const container = document.createElement('div')
    target.append(content)
    document.body.append(target, container)

    const portal = defineOverlayPortal().make({ container, target, style: '', className: 'panel' })
    portal.moveContent([content])

    expect(portal.panel.contains(content)).toBe(true)

    // 关闭路径：内容必须回到宿主组件 —— 面板一销毁就把它带走是内容直接消失。
    portal.restoreContent()
    portal.remove()

    expect(target.contains(content)).toBe(true)
    expect(portal.panel.isConnected).toBe(false)
  })

  it('可迁移到面板内的指定容器，恢复时同样回到原组件', () => {
    const target = document.createElement('div')
    const content = document.createElement('button')
    const container = document.createElement('div')
    target.append(content)
    document.body.append(target, container)

    const portal = defineOverlayPortal().make({ container, target, style: '', className: 'panel' })
    const scroll = document.createElement('div')
    portal.panel.append(scroll)
    portal.moveContent([content], scroll)

    expect(scroll.contains(content)).toBe(true)

    portal.restoreContent()
    portal.remove()

    expect(target.contains(content)).toBe(true)
  })

  it('框架在打开期物理删除已迁移节点时，不再恢复该节点', async () => {
    const target = document.createElement('div')
    const kept = document.createElement('button')
    const removed = document.createElement('button')
    const container = document.createElement('div')
    target.append(kept, removed)
    document.body.append(target, container)

    let sawMutations = false
    const portal = defineOverlayPortal().make({
      container,
      target,
      style: '',
      className: 'panel',
      onContentChange: mutations => {
        sawMutations = true
        expect(mutations.length).toBeGreaterThan(0)
      }
    })
    portal.moveContent([kept, removed])
    expect(portal.panel.contains(removed)).toBe(true)

    // 迁移批次的 observer 回调先独立结算，与真实组件"打开帧迁移、后续帧删除"一致
    await new Promise(resolve => setTimeout(resolve, 0))

    removed.remove()
    // MutationObserver 回调在微任务中派发
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(sawMutations).toBe(true)

    portal.restoreContent()
    portal.remove()

    // 框架已经删掉的节点不能被「恢复」重新插回 DOM —— 那会凭空多出一个控件。
    expect(target.contains(kept)).toBe(true)
    expect(target.contains(removed)).toBe(false)
  })
})
