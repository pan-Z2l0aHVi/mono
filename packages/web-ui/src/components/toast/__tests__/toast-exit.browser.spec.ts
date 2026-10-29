import '..'

import { afterEach, expect, it } from 'vite-plus/test'

import { pollUntil, waitForAnimationsToFinish } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

it('toast-close 等待实际退出过渡结束，支持比进入更长的退出时长', async () => {
  const el = document.createElement('web-ui-toast')
  el.duration = 0
  el.style.setProperty('--wui-duration-toast-exit', '1000ms')
  document.body.append(el)
  await el.updateComplete
  el.show()
  await el.updateComplete
  const panel = el.shadowRoot!.querySelector<HTMLElement>('[aria-live]')!
  expect(await waitForAnimationsToFinish([el, panel])).toBe(true)

  let closed = 0
  let runningAtClose = true
  el.addEventListener('toast-close', () => {
    closed++
    runningAtClose = panel.getAnimations().some(animation => animation.playState === 'running')
  })
  el.dismiss()
  await el.updateComplete
  await pollUntil(() => closed > 0, 'toast did not finish its exit transition')
  expect(closed).toBe(1)
  expect(runningAtClose, '退场仍在播放时不能宣布关闭').toBe(false)
})
