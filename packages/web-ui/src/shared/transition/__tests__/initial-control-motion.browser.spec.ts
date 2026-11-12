import '@/components/checkbox'
import '@/components/progress'
import '@/components/radio'
import '@/components/switch'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame, waitForUpdate } from '@/shared/test-utils'

type Control = HTMLElement & {
  updateComplete: Promise<unknown>
  checked?: boolean
  value?: string | number
}

const controls = [
  { name: 'switch', selector: '.wui-switch-thumb', property: 'checked' },
  { name: 'radio', selector: '.wui-radio-dot', property: 'checked' },
  { name: 'checkbox', selector: '.wui-checkbox-box', property: 'checked' },
  { name: 'progress', selector: '[part="indicator"]', property: 'value' }
] as const

afterEach(() => document.body.replaceChildren())

describe('控件初始状态过渡（浏览器）', () => {
  for (const control of controls) {
    for (const initiallyHidden of [false, true]) {
      it(`${control.name} ${initiallyHidden ? '隐藏后显示' : '初始挂载'}直接呈现初始状态，后续变化仍过渡`, async () => {
        const container = document.createElement('div')
        if (initiallyHidden) container.style.display = 'none'
        const element = document.createElement(`web-ui-${control.name}`) as Control
        element.style.setProperty('--wui-duration-trigger', '1s')
        if (control.property === 'checked') element.checked = true
        else element.value = 60
        container.append(element)
        document.body.append(container)
        await waitForUpdate(element)
        await waitForFrame()
        if (initiallyHidden) container.style.display = ''
        await waitForFrame()
        await waitForFrame()

        const target = element.shadowRoot?.querySelector<HTMLElement>(control.selector)
        if (!target) throw new Error(`${control.name} 动画目标不存在`)
        expect(target.getBoundingClientRect().width).toBeGreaterThan(0)
        const accessible = element.matches('[role]') ? element : element.shadowRoot?.querySelector('[role]')
        const actual =
          control.property === 'checked'
            ? accessible?.getAttribute('aria-checked')
            : element.getAttribute('aria-valuenow')
        const expected = control.property === 'checked' ? 'true' : String(element.value)
        expect(actual).toBe(expected)
        expect(target.getAnimations().filter(animation => animation instanceof CSSTransition)).toHaveLength(0)

        if (control.property === 'checked') element.checked = false
        else element.value = 20
        await waitForUpdate(element)
        await pollUntil(
          () => target.getAnimations().some(animation => animation instanceof CSSTransition),
          `${control.name} 状态变化未启动过渡`
        )
      })
    }
  }
})
