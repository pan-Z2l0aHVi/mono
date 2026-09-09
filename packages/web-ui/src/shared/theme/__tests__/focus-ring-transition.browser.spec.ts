import { afterEach, describe, expect, it } from 'vite-plus/test'

import '@/components/autocomplete'
import '@/components/input'
import '@/components/textarea'
import '@/components/theme'
import type { WebUiAutocomplete } from '@/components/autocomplete'
import type { WebUiInput } from '@/components/input'
import type { WebUiTextarea } from '@/components/textarea'

type FixtureElement = WebUiInput | WebUiTextarea | WebUiAutocomplete

type Fixture = {
  tag: string
  innerSelector: string
  create: () => FixtureElement
}

const fixtures: Fixture[] = [
  {
    tag: 'web-ui-input',
    innerSelector: '.wui-input-inner',
    create: (): WebUiInput => document.createElement('web-ui-input') as WebUiInput
  },
  {
    tag: 'web-ui-textarea',
    innerSelector: '.wui-textarea-inner',
    create: (): WebUiTextarea => document.createElement('web-ui-textarea') as WebUiTextarea
  },
  {
    tag: 'web-ui-autocomplete',
    innerSelector: '.input-wrapper',
    create: () => {
      const el = document.createElement('web-ui-autocomplete') as WebUiAutocomplete
      el.innerHTML = '<web-ui-option value="apple" label="Apple"></web-ui-option>'
      return el
    }
  }
]

async function mountInner(
  fixture: Fixture,
  { borderless, motion }: { borderless: boolean; motion?: string }
): Promise<HTMLElement> {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  if (motion !== undefined) theme.setAttribute('motion', motion)
  document.body.append(theme)

  const el = fixture.create()
  if (borderless) el.setAttribute('borderless', '')
  theme.append(el)
  await el.updateComplete
  return el.shadowRoot!.querySelector<HTMLElement>(fixture.innerSelector)!
}

function findFocusRingTransition(inner: HTMLElement) {
  return inner.getAnimations({ subtree: true }).find(animation => {
    const effect = animation.effect as KeyframeEffect | null
    return (
      effect?.pseudoElement === '::after' &&
      effect.target === inner &&
      (animation as CSSTransition).transitionProperty === 'box-shadow'
    )
  })
}

function fixtureHost(inner: HTMLElement): FixtureElement {
  return (inner.getRootNode() as ShadowRoot).host as FixtureElement
}

afterEach(() => document.body.replaceChildren())

describe('focus ring transition 统一契约（浏览器）', () => {
  for (const fixture of fixtures) {
    for (const borderless of [false, true]) {
      const variant = borderless ? 'borderless' : 'normal'

      it(`${fixture.tag} ${variant}：focus ring 走 --wui-duration-focus 的 box-shadow 过渡`, async () => {
        const inner = await mountInner(fixture, { borderless })
        const style = getComputedStyle(inner, '::after')
        // duration 复用 focus token（200ms），blur 回退共用同一 transition 定义
        expect(style.transitionProperty).toContain('box-shadow')
        for (const duration of style.transitionDuration.split(', ')) {
          expect(duration).toBe('0.2s')
        }

        // 只声明 transition 不够：必须确认 focused 伪类切换真的在 ::after 上启动动画
        const host = fixtureHost(inner)
        const nativeField =
          inner.shadowRoot?.querySelector<HTMLElement>('input, textarea') ??
          host.shadowRoot?.querySelector<HTMLElement>('input, textarea')
        nativeField?.dispatchEvent(new FocusEvent('focus'))
        await host.updateComplete
        await new Promise(resolve => requestAnimationFrame(resolve))

        const transition = findFocusRingTransition(inner)
        expect(transition).toBeTruthy()
        expect((transition as CSSTransition).transitionProperty).toBe('box-shadow')
        expect(transition!.effect!.getComputedTiming().duration).toBe(200)
      })

      it(`${fixture.tag} ${variant}：theme motion=reduced 时过渡归零`, async () => {
        const inner = await mountInner(fixture, { borderless, motion: 'reduced' })
        const style = getComputedStyle(inner, '::after')
        expect(style.transitionProperty).toContain('box-shadow')
        for (const duration of style.transitionDuration.split(', ')) {
          expect(duration).toBe('0s')
        }
      })
    }
  }

  it('无 theme 时 fallback 与 theme light 一致为 200ms', async () => {
    for (const fixture of fixtures) {
      const el = fixture.create()
      document.body.append(el)
      await el.updateComplete
      const inner = el.shadowRoot!.querySelector<HTMLElement>(fixture.innerSelector)!
      for (const duration of getComputedStyle(inner, '::after').transitionDuration.split(', ')) {
        expect(duration).toBe('0.2s')
      }
      el.remove()
    }
  })
})
