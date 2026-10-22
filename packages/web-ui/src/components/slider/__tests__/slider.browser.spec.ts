import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { cleanupElement, pollUntil, queryA11y } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

/**
 * 指针拖拽契约：以公开 `value` 与 `input` / `change` 派发观察手势结果。
 * 内部态 class（is-pressed / is-dragging / is-open）、`cursor`、`touch-action` 与
 * thumb 的玻璃质感（backdrop-filter / 背景色 / box-shadow）属实现与视觉细节，
 * 按 ADR-0005 §5 不在契约 spec 断言，归真机验收。
 *
 * `touch-action: none` 的**行为后果**（拖拽期间阻止页面滚动）仍在此断言——
 * 它是可观察的交互契约，而非样式值。
 */
function createSlider(): HTMLElement {
  const el = document.createElement('web-ui-slider')
  document.body.append(el)
  return el
}

type Updatable = HTMLElement & { updateComplete: Promise<unknown>; value: number; disabled: boolean }

const trackOf = (el: HTMLElement): HTMLElement => {
  const node = queryA11y(el, '[role="slider"]')
  expect(node, '未找到 role="slider" 的可交互元素').toBeTruthy()
  return node as HTMLElement
}

describe('WebUiSlider accessible name（浏览器）', () => {
  it('宿主 aria-label 命名 role=slider，多个实例保持可区分且支持更新', async () => {
    const music = createSlider() as Updatable
    const voice = createSlider() as Updatable
    await Promise.all([music.updateComplete, voice.updateComplete])

    music.setAttribute('aria-label', 'Music')
    voice.setAttribute('aria-label', 'Voice')
    await Promise.all([music.updateComplete, voice.updateComplete])

    const musicHost = page.elementLocator(music)
    const voiceHost = page.elementLocator(voice)
    expect(musicHost.getByRole('slider', { name: 'Music' }).length).toBe(1)
    expect(voiceHost.getByRole('slider', { name: 'Voice' }).length).toBe(1)
    expect(page.getByRole('slider', { name: 'Slider' }).length).toBe(0)

    cleanupElement(music)
    cleanupElement(voice)
  })

  it('宿主 aria-labelledby 使用外部引用文本并跟随文本变化', async () => {
    const label = document.createElement('span')
    label.id = 'slider-volume-label'
    label.textContent = 'Volume'
    document.body.append(label)

    const slider = createSlider() as Updatable
    await slider.updateComplete
    slider.setAttribute('aria-labelledby', label.id)
    await slider.updateComplete

    const sliderHost = page.elementLocator(slider)
    expect(sliderHost.getByRole('slider', { name: 'Volume' }).length).toBe(1)

    label.textContent = 'Master volume'
    await pollUntil(
      () => sliderHost.getByRole('slider', { name: 'Master volume' }).length === 1,
      'aria-labelledby 更新文本后 accessible name 未同步'
    )

    cleanupElement(slider)
    label.remove()
  })

  it('aria-labelledby 不把 aria-hidden 后代并入 accessible name', async () => {
    const label = document.createElement('span')
    label.id = 'slider-volume-label'
    label.append(document.createTextNode('Volume'))
    const hiddenDescription = document.createElement('span')
    hiddenDescription.setAttribute('aria-hidden', 'true')
    hiddenDescription.textContent = ' hidden description'
    label.append(hiddenDescription)
    document.body.append(label)

    const slider = createSlider() as Updatable
    await slider.updateComplete
    slider.setAttribute('aria-labelledby', label.id)
    await slider.updateComplete

    const sliderHost = page.elementLocator(slider)
    expect(sliderHost.getByRole('slider', { name: 'Volume' }).length).toBe(1)
    expect(sliderHost.getByRole('slider', { name: 'Volume hidden description' }).length).toBe(0)

    cleanupElement(slider)
    label.remove()
  })

  it('aria-labelledby 忽略非图片 alt、读取文本框值并跟随输入变化', async () => {
    const visibleLabel = document.createElement('span')
    visibleLabel.id = 'slider-visible-label'
    visibleLabel.setAttribute('alt', 'Alt Attribute')
    visibleLabel.textContent = 'Visible Text'

    const input = document.createElement('input')
    input.id = 'slider-input-label'
    input.value = 'Input Value'

    const nativeVisible = document.createElement('div')
    nativeVisible.setAttribute('role', 'slider')
    nativeVisible.setAttribute('aria-labelledby', visibleLabel.id)
    const nativeInput = document.createElement('div')
    nativeInput.setAttribute('role', 'slider')
    nativeInput.setAttribute('aria-labelledby', input.id)
    document.body.append(visibleLabel, input, nativeVisible, nativeInput)

    const visible = createSlider() as Updatable
    const fromInput = createSlider() as Updatable
    visible.setAttribute('aria-labelledby', visibleLabel.id)
    fromInput.setAttribute('aria-labelledby', input.id)
    await Promise.all([visible.updateComplete, fromInput.updateComplete])

    expect(page.getByRole('slider', { name: 'Visible Text' }).length).toBe(2)
    expect(page.getByRole('slider', { name: 'Alt Attribute' }).length).toBe(0)
    expect(page.getByRole('slider', { name: 'Input Value' }).length).toBe(2)

    input.value = 'Updated Input Value'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await pollUntil(
      () => page.getByRole('slider', { name: 'Updated Input Value' }).length === 2,
      'aria-labelledby 未跟随被引用文本框的 value 更新'
    )

    cleanupElement(visible)
    cleanupElement(fromInput)
    visibleLabel.remove()
    input.remove()
    nativeVisible.remove()
    nativeInput.remove()
  })
})

const pointer = (type: string, x: number, y: number): PointerEvent =>
  new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: y })

describe('WebUiSlider 指针拖拽（浏览器）', () => {
  it('真实指针拖拽更新 value 并在松手时派发一次 change', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    el.addEventListener('input', e => inputEvents.push(e))
    el.addEventListener('change', e => changeEvents.push(e))

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.25, y))
    await el.updateComplete
    const afterDown = el.value

    track.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.75, y))
    await pollUntil(() => el.value > 50, '拖拽到 75% 后 value 未越过中点')

    track.dispatchEvent(pointer('pointerup', rect.left + rect.width * 0.75, y))
    await el.updateComplete

    expect(afterDown).toBeLessThan(50)
    expect(el.value).toBeGreaterThan(50)
    expect(inputEvents.length).toBeGreaterThan(0)
    expect(changeEvents).toHaveLength(1)
    cleanupElement(el)
  })

  it('竖向为主的斜拖被判定为滚动时不改变 value', async () => {
    const el = createSlider() as Updatable
    el.value = 40
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()
    const downX = rect.left + rect.width * 0.25
    const downY = rect.top + rect.height / 2
    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    el.addEventListener('input', e => inputEvents.push(e))
    el.addEventListener('change', e => changeEvents.push(e))

    track.dispatchEvent(pointer('pointerdown', downX, downY))
    window.dispatchEvent(pointer('pointermove', downX + 12, downY + 53))
    window.dispatchEvent(pointer('pointermove', downX + 20, downY + 103))
    window.dispatchEvent(pointer('pointerup', downX + 20, downY + 103))
    await el.updateComplete

    expect(el.value).toBe(40)
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
    cleanupElement(el)
  })

  it('竖向滑动越过交叉轴阈值后回到起点也不提交 tap', async () => {
    const el = createSlider() as Updatable
    el.value = 40
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()
    const downX = rect.left + rect.width * 0.4
    const downY = rect.top + rect.height / 2
    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    el.addEventListener('input', e => inputEvents.push(e))
    el.addEventListener('change', e => changeEvents.push(e))

    track.dispatchEvent(pointer('pointerdown', downX, downY))
    window.dispatchEvent(pointer('pointermove', downX + 2, downY + 53))
    window.dispatchEvent(pointer('pointermove', downX + 2, downY + 1))
    window.dispatchEvent(pointer('pointerup', downX + 2, downY + 1))
    await el.updateComplete

    expect(el.value).toBe(40)
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
    cleanupElement(el)
  })

  it('pointerup 后继续移动不再更新 value', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.5, y))
    await el.updateComplete

    track.dispatchEvent(pointer('pointerup', rect.left + rect.width * 0.5, y))
    await el.updateComplete
    const valueAtRelease = el.value

    track.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.9, y))
    await el.updateComplete

    expect(el.value).toBe(valueAtRelease)
    cleanupElement(el)
  })

  it('指针交互后仍可用方向键调整 value', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.5, rect.top + rect.height / 2))
    track.dispatchEvent(pointer('pointerup', rect.left + rect.width * 0.5, rect.top + rect.height / 2))
    await el.updateComplete
    expect(el.value).toBe(50)

    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await el.updateComplete

    expect(el.value).toBe(51)
    cleanupElement(el)
  })

  it('拖拽期间阻止 touchmove 默认滚动，松手后解除', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.25, y))
    await el.updateComplete

    // 意图判定前：shadow 内非 composed 的 touchmove 也已被守卫阻止，
    // 这是 iOS Safari 滚动接管前需要的关键兜底。
    const onTrack = new TouchEvent('touchmove', { bubbles: true, composed: false, cancelable: true })
    track.dispatchEvent(onTrack)
    expect(onTrack.defaultPrevented).toBe(true)

    window.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.75, y))
    await el.updateComplete

    const onTrackAfterCommit = new TouchEvent('touchmove', { bubbles: true, composed: false, cancelable: true })
    track.dispatchEvent(onTrackAfterCommit)
    expect(onTrackAfterCommit.defaultPrevented).toBe(true)

    // shadow 外的 touchmove 不受影响，说明守卫没有挂成全局死代码。
    const onWindow = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    window.dispatchEvent(onWindow)
    expect(onWindow.defaultPrevented).toBe(false)

    window.dispatchEvent(pointer('pointerup', rect.left + rect.width * 0.75, y))
    await el.updateComplete

    const onTrackAfterRelease = new TouchEvent('touchmove', { bubbles: true, composed: false, cancelable: true })
    track.dispatchEvent(onTrackAfterRelease)
    expect(onTrackAfterRelease.defaultPrevented).toBe(false)
    cleanupElement(el)
  })

  it('捕获转手：子节点丢失捕获不取消拖拽，track 自身丢失才取消', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    // track 的子树节点（结构关系定位，非内部 class）：模拟指针命中到的深层元素
    const hitChild = track.firstElementChild as HTMLElement
    expect(hitChild, 'track 应有可命中的子节点').toBeTruthy()

    const rect = track.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.25, y))
    await el.updateComplete

    // 越过意图阈值：组件把指针捕获转手到 track
    window.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.25 + 10, y))
    await el.updateComplete

    // 命中元素收到 lostpointercapture（隐式捕获被 track 抢走）——必须忽略
    hitChild.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, composed: true, pointerId: 1 }))
    await el.updateComplete

    window.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.75, y))
    await el.updateComplete
    expect(el.value).toBeGreaterThan(50)

    track.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, composed: true, pointerId: 1 }))
    await el.updateComplete

    const afterCancel = el.value
    window.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.2, y))
    await el.updateComplete
    expect(el.value).toBe(afterCancel)
    cleanupElement(el)
  })
})

/**
 * step 不整除 `(max - min)` 时，规整（先 clamp 再按 step 取整）会把值推过 max：
 * `max=100 / step=15` → `round(100 / 15) = 7` → `7 * 15 = 105`。
 * 契约是任何输入（含 End 键）都不得越出 `[min, max]`。
 */
describe('WebUiSlider 值规整不越界（浏览器）', () => {
  const press = async (el: Updatable, key: string) => {
    trackOf(el).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }))
    await el.updateComplete
  }

  it('End 键在 step 不整除时停在 max', async () => {
    const el = createSlider() as Updatable & { min: number; max: number; step: number }
    el.min = 0
    el.max = 100
    el.step = 15
    el.value = 0
    await el.updateComplete

    await press(el, 'End')

    expect(el.value).toBeLessThanOrEqual(100)
    expect(el.value).toBe(100)
    expect(trackOf(el).getAttribute('aria-valuenow')).toBe('100')
    expect(trackOf(el).getAttribute('aria-valuemax')).toBe('100')
    cleanupElement(el)
  })

  it('Home 键在 step 不整除时停在 min', async () => {
    const el = createSlider() as Updatable & { min: number; max: number; step: number }
    el.min = 3
    el.max = 100
    el.step = 7
    el.value = 50
    await el.updateComplete

    await press(el, 'Home')

    expect(el.value).toBe(3)
    cleanupElement(el)
  })

  it('ArrowUp 到顶部不越过 max', async () => {
    const el = createSlider() as Updatable & { min: number; max: number; step: number }
    el.min = 0
    el.max = 100
    el.step = 15
    el.value = 90
    await el.updateComplete

    await press(el, 'ArrowUp')

    expect(el.value).toBeLessThanOrEqual(100)
    cleanupElement(el)
  })

  it('步进后的值仍是 step 的整数倍（不因收敛破坏网格）', async () => {
    const el = createSlider() as Updatable & { min: number; max: number; step: number }
    el.min = 0
    el.max = 100
    el.step = 15
    el.value = 0
    await el.updateComplete

    await press(el, 'ArrowUp')
    await press(el, 'ArrowUp')
    expect(el.value).toBe(30)

    await press(el, 'End')
    expect(el.value).toBe(100)
    cleanupElement(el)
  })
})
