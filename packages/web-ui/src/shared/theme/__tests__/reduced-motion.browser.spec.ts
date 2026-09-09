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

async function mountInner(fixture: Fixture, borderless: boolean): Promise<HTMLElement> {
  const theme = document.createElement('web-ui-theme')
  theme.setAttribute('appearance', 'light')
  theme.setAttribute('motion', 'system')
  document.body.append(theme)

  const el = fixture.create()
  if (borderless) el.setAttribute('borderless', '')
  theme.append(el)
  await el.updateComplete
  return el.shadowRoot!.querySelector<HTMLElement>(fixture.innerSelector)!
}

afterEach(() => document.body.replaceChildren())

// 本文件运行在 Playwright reducedMotion: 'reduce' 的独立项目中（vite 配置按文件名路由）；
// theme motion=system 时组件应跟随系统偏好将 focus 过渡归零。
describe('系统 prefers-reduced-motion 下的 focus ring transition（浏览器）', () => {
  for (const fixture of fixtures) {
    for (const borderless of [false, true]) {
      const variant = borderless ? 'borderless' : 'normal'

      it(`${fixture.tag} ${variant}：system 偏好 reduce 时过渡归零`, async () => {
        const inner = await mountInner(fixture, borderless)
        const style = getComputedStyle(inner, '::after')
        expect(style.transitionProperty).toContain('box-shadow')
        for (const duration of style.transitionDuration.split(', ')) {
          expect(duration).toBe('0s')
        }
      })
    }
  }
})
