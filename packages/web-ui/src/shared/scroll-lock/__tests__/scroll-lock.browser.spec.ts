import { afterEach, describe, expect, it } from 'vite-plus/test'

import { lockScroll, unlockScroll } from '../scroll-lock'

const SCROLL_Y = 3000

// lockScroll 是模块级引用计数，用例必须自己配平，避免互相污染。
let heldLocks = 0

function lock() {
  lockScroll()
  heldLocks++
}

function unlock() {
  unlockScroll()
  heldLocks--
}

function createSpacer(height: number): HTMLElement {
  const spacer = document.createElement('div')
  spacer.style.cssText = `height: ${height}px;`
  document.body.append(spacer)
  return spacer
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

afterEach(async () => {
  for (let index = 0; index < heldLocks; index++) unlockScroll()
  heldLocks = 0
  window.scrollTo(0, 0)
  document.body.replaceChildren()
  document.body.removeAttribute('style')
  await nextFrame()
})

describe('scroll lock（浏览器）', () => {
  it('锁定期间 window.scrollY 不归零、文档高度不塌缩', async () => {
    // 视口约 896px，内容需高于 SCROLL_Y + 视口高才能滚到 SCROLL_Y。
    createSpacer(6000)
    window.scrollTo(0, SCROLL_Y)
    await nextFrame()

    const before = {
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight
    }
    expect(before.scrollY).toBe(SCROLL_Y)

    lock()
    expect(window.scrollY).toBe(before.scrollY)
    expect(document.documentElement.scrollHeight).toBe(before.scrollHeight)

    unlock()
    expect(window.scrollY).toBe(before.scrollY)
  })

  it('锁定期间按 scrollY 定位的行仍落在视口内', async () => {
    createSpacer(3400)
    const row = document.createElement('div')
    row.style.cssText = 'height: 20px;'
    document.body.append(row)
    createSpacer(2000)
    window.scrollTo(0, SCROLL_Y)
    await nextFrame()

    const documentTop = row.getBoundingClientRect().top + window.scrollY
    expect(documentTop).toBeGreaterThan(SCROLL_Y)
    expect(documentTop).toBeLessThan(SCROLL_Y + window.innerHeight)

    lock()
    // 虚拟列表按 `scrollY` 反推行位置（等价于 virtual-core 的 window offset）。
    // body 被 position:fixed 移出文档流时 scrollY 归零，行会被顶到视口外 → 整屏空白。
    const rendered = documentTop - window.scrollY
    expect(rendered).toBeGreaterThanOrEqual(0)
    expect(rendered).toBeLessThan(window.innerHeight)
    expect(document.documentElement.scrollHeight).toBeGreaterThan(window.innerHeight)

    unlock()
    expect(row.getBoundingClientRect().top).toBe(documentTop - SCROLL_Y)
  })

  it('解锁后根元素样式交还', async () => {
    createSpacer(6000)

    lock()
    expect(document.documentElement.style.overflow).toBe('hidden')

    // 不锁：解锁后必须交还给页面自己的样式，不能留下残留。
    unlock()
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.documentElement.style.overscrollBehavior).toBe('')
  })
})
