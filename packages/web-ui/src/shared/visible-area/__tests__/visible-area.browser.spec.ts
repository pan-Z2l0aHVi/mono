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
    await pollUntil(() => areas.length > 0, 'Expected visible-area tracker to report first area')

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
    const countAfterFirst = areas.length
    tracker.refresh()
    await pollUntil(() => areas.length > countAfterFirst, 'Expected visible-area tracker to report after refresh')

    expect(lastArea(areas)).toEqual({
      top: 560,
      right: 800,
      bottom: 600,
      left: 760,
      width: 40,
      height: 40
    })

    target.style.top = '620px'
    const countAfterSecond = areas.length
    tracker.refresh()
    await pollUntil(() => areas.length > countAfterSecond, 'Expected visible-area tracker to report after refresh')

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
    await pollUntil(() => areas.length > 0, 'Expected visible-area tracker to report first area')

    expect(lastArea(areas)).toMatchObject({ top: 40, bottom: 140, height: 100 })

    const countAfterConnect = areas.length
    await scrollWindowTo(80)
    await pollUntil(() => areas.length > countAfterConnect, 'Expected visible-area tracker to report after scroll')
    expect(lastArea(areas)).toMatchObject({ top: 0, bottom: 60, height: 60 })

    target.style.top = '20px'
    target.style.height = '160px'
    const countAfterScroll = areas.length
    await pollUntil(
      () => areas.length > countAfterScroll,
      'Expected visible-area tracker to report after target resize'
    )
    expect(lastArea(areas)).toMatchObject({ top: 0, bottom: 100, height: 100 })
  })

  it('替换目标时停止观察旧元素，并在重连后重新测量当前目标', async () => {
    await setViewport(800, 600)
    const first = createFixedTarget('left: 10px; top: 10px; width: 80px; height: 40px;')
    const second = createFixedTarget('left: 20px; top: 20px; width: 80px; height: 60px;')
    const { areas, tracker } = createTracker()

    tracker.setTarget(first)
    tracker.connect()
    await pollUntil(() => areas.length > 0, 'Expected visible-area tracker to report first area')
    expect(lastArea(areas)).toMatchObject({ top: 10, bottom: 50, height: 40 })

    const countAfterFirst = areas.length
    tracker.setTarget(second)
    await pollUntil(() => areas.length > countAfterFirst, 'Expected visible-area tracker to report after target change')
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

    const countAfterDisconnect = areas.length
    tracker.connect()
    await pollUntil(
      () => areas.length > countAfterDisconnect,
      'Expected visible-area tracker to report after reconnect'
    )
    expect(lastArea(areas)).toMatchObject({ top: 20, bottom: 140, height: 120 })

    const countAfterReconnect = areas.length
    tracker.setTarget(null)
    await pollUntil(
      () => areas.length > countAfterReconnect,
      'Expected visible-area tracker to report after target null'
    )
    expect(lastArea(areas)).toEqual(emptyVisibleArea)
  })
})
