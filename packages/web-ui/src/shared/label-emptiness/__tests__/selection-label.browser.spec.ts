import '@/components/checkbox'
import '@/components/radio'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiCheckbox } from '@/components/checkbox'
import type { WebUiRadio } from '@/components/radio'
import { cleanupElement, mountElement, waitForFrame, waitForUpdate } from '@/shared/test-utils'

/*
 * label 槽位没有可渲染内容时，控件只占 indicator 那么宽。
 *
 * 判据全部走宿主几何：外壳里那条 gap 是内部实现，测试只看「单独使用的 radio / checkbox 右侧还
 * 多不多出一段」。宽度由 ResizeObserver 的异步回调决定，所以每条断言都轮询而不是只等一次渲染。
 */
const INDICATOR_SIZE = 18
const LABEL_GAP = 10
const LABELED_WIDTH = 40
const LABELED_BOX = `display: inline-block; width: ${LABELED_WIDTH}px`

/** 视觉隐藏的无障碍名：出流，不产生行内盒，但仍然是被 assign 进 slot 的真实内容。 */
const SR_ONLY_BOX =
  'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0'

const LABELED_SIZE = INDICATOR_SIZE + LABEL_GAP + LABELED_WIDTH

async function widthOf(el: WebUiCheckbox | WebUiRadio) {
  await waitForUpdate(el)
  await waitForFrame()
  await waitForUpdate(el)
  return Math.round(el.getBoundingClientRect().width)
}

afterEach(() => document.body.replaceChildren())

describe('选择控件的空 label（浏览器）', () => {
  it('槽位为空时不占间距', async () => {
    const checkbox = mountElement<WebUiCheckbox>('web-ui-checkbox')
    const radio = mountElement<WebUiRadio>('web-ui-radio')

    await expect.poll(() => widthOf(checkbox)).toBe(INDICATOR_SIZE)
    await expect.poll(() => widthOf(radio)).toBe(INDICATOR_SIZE)

    cleanupElement(checkbox)
    cleanupElement(radio)
  })

  it('只挂无障碍名时同样不占间距，且 label 照旧被渲染', async () => {
    const checkbox = mountElement<WebUiCheckbox>('web-ui-checkbox', {
      html: `<span style="${SR_ONLY_BOX}">选择「甲」</span>`
    })

    await expect.poll(() => widthOf(checkbox)).toBe(INDICATOR_SIZE)

    // 收掉的只有间距：label 节点仍在渲染树里，无障碍名不会因此丢掉。
    // 不判 computed position——SR_ONLY_BOX 是那串 position 的写入方，读回来永远是自己写的值。
    const label = checkbox.querySelector('span')
    expect(label).not.toBeNull()
    const labelStyle = label ? getComputedStyle(label) : null
    expect(labelStyle?.display).not.toBe('none')

    cleanupElement(checkbox)
  })

  it('label 有内容时间距照旧', async () => {
    const checkbox = mountElement<WebUiCheckbox>('web-ui-checkbox', {
      html: `<span style="${LABELED_BOX}">记住我</span>`
    })
    const radio = mountElement<WebUiRadio>('web-ui-radio', {
      html: `<span style="${LABELED_BOX}">记住我</span>`
    })

    await expect.poll(() => widthOf(checkbox)).toBe(LABELED_SIZE)
    await expect.poll(() => widthOf(radio)).toBe(LABELED_SIZE)

    cleanupElement(checkbox)
    cleanupElement(radio)
  })

  it('label 增删后宽度跟着收敛', async () => {
    const checkbox = mountElement<WebUiCheckbox>('web-ui-checkbox', {
      html: `<span style="${LABELED_BOX}">记住我</span>`
    })
    await expect.poll(() => widthOf(checkbox)).toBe(LABELED_SIZE)

    checkbox.replaceChildren()
    await expect.poll(() => widthOf(checkbox)).toBe(INDICATOR_SIZE)

    checkbox.innerHTML = `<span style="${SR_ONLY_BOX}">仅无障碍名</span>`
    await expect.poll(() => widthOf(checkbox)).toBe(INDICATOR_SIZE)

    checkbox.innerHTML = `<span style="${LABELED_BOX}">记住我</span>`
    await expect.poll(() => widthOf(checkbox)).toBe(LABELED_SIZE)

    cleanupElement(checkbox)
  })

  it('移出再放回后仍然收敛', async () => {
    const checkbox = mountElement<WebUiCheckbox>('web-ui-checkbox', {
      html: `<span style="${LABELED_BOX}">记住我</span>`
    })
    await expect.poll(() => widthOf(checkbox)).toBe(LABELED_SIZE)

    /*
     * 重连不会排一次更新：断开时拆掉的观察若接不回来，此后 label 怎么改宽度都停在断开前那一次，
     * 所以这里必须断言「重连后清空」而不是只断言「重连后还是原来的宽度」。
     */
    checkbox.remove()
    document.body.append(checkbox)

    checkbox.replaceChildren()
    await expect.poll(() => widthOf(checkbox)).toBe(INDICATOR_SIZE)

    checkbox.innerHTML = `<span style="${LABELED_BOX}">记住我</span>`
    await expect.poll(() => widthOf(checkbox)).toBe(LABELED_SIZE)

    cleanupElement(checkbox)
  })

  it('隐藏时挂载、随后显示的控件会收敛到 label 真正需要的宽度', async () => {
    const parent = document.createElement('div')
    parent.style.display = 'none'
    document.body.append(parent)

    const checkbox = mountElement<WebUiCheckbox>('web-ui-checkbox', {
      html: `<span style="${LABELED_BOX}">记住我</span>`,
      parent
    })
    await waitForFrame()

    parent.style.display = ''
    await expect.poll(() => widthOf(checkbox)).toBe(LABELED_SIZE)

    cleanupElement(parent)
  })

  it('隐藏时空槽位挂载、显示后仍然跟着 label 收敛', async () => {
    const parent = document.createElement('div')
    parent.style.display = 'none'
    document.body.append(parent)

    const checkbox = mountElement<WebUiCheckbox>('web-ui-checkbox', { parent })
    await waitForFrame()

    parent.style.display = ''
    await expect.poll(() => widthOf(checkbox)).toBe(INDICATOR_SIZE)

    // 到这一步观察仍然活着，才说明隐藏阶段挂载没有把尺寸回调丢掉。
    checkbox.innerHTML = `<span style="${LABELED_BOX}">记住我</span>`
    await expect.poll(() => widthOf(checkbox)).toBe(LABELED_SIZE)

    cleanupElement(parent)
  })
})
