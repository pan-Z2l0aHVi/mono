import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil } from '@/shared/test-utils'
import { scrollWindowTo, setViewport } from '@/shared/test-utils/viewport'

import { defineVisibleAreaTracker, type VisibleArea, type VisibleAreaTracker } from '..'

const emptyVisibleArea: VisibleArea = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: 0,
  height: 0
}

const trackers: VisibleAreaTracker[] = []

function createTracker() {
  const areas: VisibleArea[] = []
  const tracker = defineVisibleAreaTracker({
    onVisibleAreaChange: area => areas.push(area)
  }).make()
  trackers.push(tracker)
  return { areas, tracker }
}

function createFixedTarget(style: string): HTMLElement {
  const target = document.createElement('div')
  target.style.cssText = `position: fixed; box-sizing: border-box; ${style}`
  document.body.append(target)
  return target
}

async function nextFrame(count = 1) {
  for (let index = 0; index < count; index++) {
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
}

/**
 * 等 tracker **回报出**期待的那组读数，而不是「等几帧」。
 *
 * tracker 的更新经由它自己的滚动 / 尺寸监听再批处理上报，`nextFrame(2)` 是赌它在
 * 两个 rAF 内派发——负载下这个赌会输，输掉的形态是「断言读到的是上一帧的旧读数」，
 * 与「tracker 没跟上」在读数上完全一样。改成轮询期待值本身：期待值没到位就一直等，
 * 到位即返回，诊断里带着当前读数。
 */
async function expectArea(areas: readonly VisibleArea[], expected: Partial<VisibleArea>): Promise<void> {
  const matches = (area: VisibleArea) =>
    Object.entries(expected).every(([key, value]) => area[key as keyof VisibleArea] === value)
  await pollUntil(
    () => matches(lastArea(areas)),
    () => `visible area 未到达期待值 ${JSON.stringify(expected)}（最新读到 ${JSON.stringify(lastArea(areas))}）`,
    5000
  )
  expect(lastArea(areas)).toMatchObject(expected)
}

function lastArea(areas: readonly VisibleArea[]): VisibleArea {
  const area = areas[areas.length - 1]
  if (!area) throw new Error('Expected visible-area tracker to report an area.')
  return area
}

afterEach(async () => {
  trackers.splice(0).forEach(tracker => tracker.disconnect())
  await scrollWindowTo(0)
  document.body.replaceChildren()
  document.body.removeAttribute('style')
  await setViewport(1280, 720)
})

describe('defineVisibleAreaTracker（浏览器）', () => {
  it('报告目标与 viewport 的完整、部分和空交集', async () => {
    await setViewport(800, 600)
    const target = createFixedTarget('left: -20px; top: -30px; width: 120px; height: 100px;')
    const { areas, tracker } = createTracker()

    tracker.setTarget(target)
    tracker.connect()
    await nextFrame()

    expect(lastArea(areas)).toEqual({
      top: 0,
      right: 100,
      bottom: 70,
      left: 0,
      width: 100,
      height: 70
    })

    target.style.left = '760px'
    target.style.top = '560px'
    tracker.refresh()
    await nextFrame()

    expect(lastArea(areas)).toEqual({
      top: 560,
      right: 800,
      bottom: 600,
      left: 760,
      width: 40,
      height: 40
    })

    target.style.top = '620px'
    tracker.refresh()
    await nextFrame()

    expect(lastArea(areas)).toEqual(emptyVisibleArea)
  })

  it('响应页面滚动和目标尺寸变化', async () => {
    await setViewport(800, 600)
    const spacer = document.createElement('div')
    spacer.style.height = '2000px'
    const target = document.createElement('div')
    target.style.cssText = 'position: absolute; left: 20px; top: 40px; width: 120px; height: 100px;'
    document.body.append(spacer, target)

    const { areas, tracker } = createTracker()
    tracker.setTarget(target)
    tracker.connect()
    await nextFrame()

    expect(lastArea(areas)).toMatchObject({ top: 40, bottom: 140, height: 100 })

    await scrollWindowTo(80)
    await expectArea(areas, { top: 0, bottom: 60, height: 60 })

    target.style.top = '20px'
    target.style.height = '160px'
    await expectArea(areas, { top: 0, bottom: 100, height: 100 })
  })

  it('替换目标时停止观察旧元素，并在重连后重新测量当前目标', async () => {
    await setViewport(800, 600)
    const first = createFixedTarget('left: 10px; top: 10px; width: 80px; height: 40px;')
    const second = createFixedTarget('left: 20px; top: 20px; width: 80px; height: 60px;')
    const { areas, tracker } = createTracker()

    tracker.setTarget(first)
    tracker.connect()
    await nextFrame()
    expect(lastArea(areas)).toMatchObject({ top: 10, bottom: 50, height: 40 })

    tracker.setTarget(second)
    await nextFrame()
    expect(lastArea(areas)).toMatchObject({ top: 20, bottom: 80, height: 60 })

    const countAfterTargetChange = areas.length
    first.style.height = '180px'
    await nextFrame(2)
    expect(areas).toHaveLength(countAfterTargetChange)

    tracker.disconnect()
    second.style.height = '120px'
    window.dispatchEvent(new Event('scroll'))
    tracker.refresh()
    await nextFrame(2)
    expect(areas).toHaveLength(countAfterTargetChange)

    tracker.connect()
    await nextFrame()
    expect(lastArea(areas)).toMatchObject({ top: 20, bottom: 140, height: 120 })

    tracker.setTarget(null)
    await nextFrame()
    expect(lastArea(areas)).toEqual(emptyVisibleArea)
  })
})
