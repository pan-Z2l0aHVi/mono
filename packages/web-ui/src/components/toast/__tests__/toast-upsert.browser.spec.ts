import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import { pollUntil, waitForFrame } from '@/shared/test-utils'

import { toast } from '..'

function fallbackRoot(): ShadowRoot | null {
  return document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot ?? null
}

function findToast(id: string) {
  return Array.from(fallbackRoot()?.querySelectorAll('web-ui-toast') ?? []).find(el => el.toastId === id)
}

/**
 * 批量挂载是微任务，`show()` 在其后的 rAF 里：连续两个 rAF 覆盖「微任务 + 首个渲染
 * 步进」这条固定链路，没有可等的条件，因此不是轮询。
 */
async function waitMounted(): Promise<void> {
  await Promise.resolve()
  await waitForFrame()
  await waitForFrame()
}

// 游标在文件间继承且位置不定：停在 toast 将出现的位置会触发挂载暂停（show() 的设计
// 行为），搬迁后又可能永不 resume。停靠到 top-right / bottom-left 都覆盖不到的中性位置。
function createNeutralPark(): HTMLElement {
  const park = document.createElement('div')
  park.id = 'neutral-park'
  park.style.cssText = 'position:fixed;left:50%;top:50%;width:32px;height:32px;z-index:2147483647'
  document.body.appendChild(park)
  return park
}

afterEach(() => {
  toast._reset()
  document.body.replaceChildren()
})

/*
 * CI 上游标位置继承自上一个测试文件：若停在 toast 挂载点，挂载即触发悬停暂停
 *（show() 的设计行为），搬迁后静止游标不保证补发 pointerleave → 永不 resume → 永不关闭。
 * 用例前先把指针停靠到中性位置（left:50%;top:50%），使暂停点确定化。
 */
describe('toast upsert（浏览器）', () => {
  /*
   * jsdom 没有 Element.moveBefore()，走的是 pause/resume 降级分支；真实 Chromium 走
   * moveBefore + connectedMoveCallback。两条路径都要保住同一条 toast，并在搬运后仍能
   * 自动关闭。
   *
   * 只读公开面：同一条元素、屏幕上的位置、以及它最终离场。「搬运后按剩余时间而不是
   * 重启满时长」需要源码公开一个剩余时长观测口才能判，公开面（visible / DOM 在场）只能
   * 靠墙钟把两者分开——那正是 flaky 形态，因此不作为断言主题。
   */
  it('position 变化后搬到新位置，同一条 toast 仍能自动关闭', async () => {
    // 停靠游标到中性位置，避免继承的游标落在 top-right 挂载点触发挂载暂停。
    const park = createNeutralPark()
    await page.elementLocator(park).hover()
    const id = toast.info('搬运中', { id: 'move', position: 'top-right', duration: 0 })
    await waitMounted()

    const movedTo = (el: Element) => {
      const rect = el.getBoundingClientRect()
      return rect.top + rect.height / 2 > innerHeight / 2 && rect.left < innerWidth / 2
    }

    const before = findToast(id)
    // 缺元素当场红：否则后面的断言都在 undefined 上漂，分不清是没挂上还是没搬走。
    if (!before) throw new Error(`toast ${id} was not mounted into the overlay root`)
    expect(movedTo(before), '搬运前应在右上角').toBe(false)

    // 准备完成后，在同一同步段启动倒计时并搬迁，保留原生 moveBefore 的在途计时契约。
    toast({ id, message: '搬运中', duration: 3000 })
    toast({ id, message: '搬运中', position: 'bottom-left' })
    await pollUntil(
      () => {
        const el = findToast(id)
        return el !== undefined && movedTo(el)
      },
      'toast 没有出现在左下角',
      2500
    )

    // 搬运换的是位置，不是新建一条：用户看到的仍是同一个对象。
    expect(findToast(id)).toBe(before)

    await pollUntil(() => findToast(id) === undefined, 'toast did not leave the DOM after auto-close', 5000)
  })
})
