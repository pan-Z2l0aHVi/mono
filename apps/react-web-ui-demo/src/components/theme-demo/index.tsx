import type { WebUiSegmented } from '@greypan/web-ui'
import { useState } from 'react'

type ThemeAppearance = 'light' | 'dark' | 'system'
type ThemeMotion = 'full' | 'reduced' | 'system'

const APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])
const MOTIONS = new Set<ThemeMotion>(['full', 'reduced', 'system'])

function isAppearance(value: string): value is ThemeAppearance {
  return APPEARANCES.has(value as ThemeAppearance)
}
function isMotion(value: string): value is ThemeMotion {
  return MOTIONS.has(value as ThemeMotion)
}

function ThemeDemo() {
  const [appearance, setAppearance] = useState<'light' | 'dark' | 'system'>('light')
  const [motion, setMotion] = useState<'full' | 'reduced' | 'system'>('system')
  const [innerAppearance, setInnerAppearance] = useState<'light' | 'dark'>('dark')
  const [innerMotion, setInnerMotion] = useState<'full' | 'reduced' | 'system'>('full')
  const [innermostAppearance, setInnermostAppearance] = useState<'light' | 'dark'>('light')
  const [innermostMotion, setInnermostMotion] = useState<'full' | 'reduced' | 'system'>('system')
  const [scopedSelectValue, setScopedSelectValue] = useState('portal')
  const [scopedDialogOpen, setScopedDialogOpen] = useState(false)

  const updateAppearance = (event: React.InputEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isAppearance(value)) setAppearance(value)
  }
  const updateMotion = (event: React.InputEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isMotion(value)) setMotion(value)
  }
  const updateInnerAppearance = (event: React.InputEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isAppearance(value) && value !== 'system') setInnerAppearance(value)
  }
  const updateInnermostAppearance = (event: React.InputEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isAppearance(value) && value !== 'system') setInnermostAppearance(value)
  }
  const updateInnerMotion = (event: React.InputEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isMotion(value)) setInnerMotion(value)
  }
  const updateInnermostMotion = (event: React.InputEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isMotion(value)) setInnermostMotion(value)
  }

  return (
    <div>
      <h1>Theme</h1>
      <p className="mb-4 text-(--wui-color-text-secondary)">
        web-ui-theme 支持多层嵌套，每一层独立控制外观与动效。内层主题优先于外层。
      </p>

      <h2>Basic usage (single level)</h2>

      <web-ui-theme
        appearance={appearance}
        motion={motion}
        className="block rounded-xl border border-(--wui-color-border) p-6"
      >
        <section className="bg-(--wui-color-page)">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-(--wui-color-text-secondary)">Appearance</span>
              <web-ui-segmented
                value={appearance}
                onInput={updateAppearance}
                aria-label="Single-level theme appearance"
              >
                <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
                <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
                <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
              </web-ui-segmented>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-(--wui-color-text-secondary)">Motion preference</span>
              <web-ui-segmented value={motion} onInput={updateMotion} aria-label="Single-level theme motion preference">
                <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
                <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
                <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
              </web-ui-segmented>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <web-ui-button variant="primary">Primary</web-ui-button>
            <web-ui-button variant="secondary">Secondary</web-ui-button>
            <web-ui-button variant="danger">Danger</web-ui-button>
            <web-ui-input value="Theme scope"></web-ui-input>
            <web-ui-switch checked></web-ui-switch>
          </div>

          <h3>Inherited from the overlay</h3>
          <p className="mb-3 text-sm text-(--wui-color-text-secondary)">
            Portal Select、Toast 与 Dialog 均继承当前主题范围的外观和动效 token。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <web-ui-select
              value={scopedSelectValue}
              portal
              aria-label="Theme-scoped portal select"
              onChange={event => setScopedSelectValue(event.currentTarget.value)}
            >
              <web-ui-option value="portal" label="Portal overlay">
                Portal overlay
              </web-ui-option>
              <web-ui-option value="theme" label="Theme tokens">
                Theme tokens
              </web-ui-option>
              <web-ui-option value="motion" label="Motion tokens">
                Motion tokens
              </web-ui-option>
            </web-ui-select>
            <web-ui-button
              variant="secondary"
              onClick={() => {
                void import('@greypan/web-ui').then(m =>
                  m.toast.info('Toast mounts into the overlay root of the current theme scope.', {
                    heading: 'Scoped toast',
                    duration: 3000
                  })
                )
              }}
            >
              Show a toast
            </web-ui-button>
            <web-ui-button variant="secondary" onClick={() => setScopedDialogOpen(true)}>
              Open a dialog
            </web-ui-button>
          </div>

          <web-ui-dialog open={scopedDialogOpen} onopen-change={event => setScopedDialogOpen(event.detail.open)}>
            <span slot="header">Scoped dialog</span>
            Dialog 位于原生 top layer，仍继承当前 theme scope 的颜色与动效 token。
            <web-ui-button slot="footer" variant="primary" full onClick={() => setScopedDialogOpen(false)}>
              Close
            </web-ui-button>
          </web-ui-dialog>
        </section>
      </web-ui-theme>

      <h2>Nested levels</h2>
      <p className="mb-4 text-sm text-(--wui-color-text-secondary)">
        外层 Light / Reduced → 内层 Dark / Full → 最内层 Light / System，每层独立控制，互不干扰。
      </p>

      <web-ui-theme
        appearance="light"
        motion="reduced"
        className="block rounded-xl border border-(--wui-color-border) p-6"
      >
        <section className="bg-(--wui-color-page)">
          <p className="mb-2 text-xs text-(--wui-color-text-secondary)">Outer (Light / Reduced)</p>
          <div className="flex flex-wrap gap-3">
            <web-ui-button variant="primary">Outer button</web-ui-button>
            <web-ui-switch checked></web-ui-switch>
          </div>

          <web-ui-theme
            appearance={innerAppearance}
            motion={innerMotion}
            className="mt-4 block rounded-xl border border-(--wui-color-border) p-6"
          >
            <section className="bg-(--wui-color-page)">
              <p className="mb-2 text-xs text-(--wui-color-text-secondary)">Inner (toggleable)</p>
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-(--wui-color-text-secondary)">Inner appearance</span>
                  <web-ui-segmented
                    value={innerAppearance}
                    onInput={updateInnerAppearance}
                    aria-label="Inner theme appearance"
                  >
                    <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
                    <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
                  </web-ui-segmented>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-(--wui-color-text-secondary)">Inner motion</span>
                  <web-ui-segmented
                    value={innerMotion}
                    onInput={updateInnerMotion}
                    aria-label="Inner theme motion preference"
                  >
                    <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
                    <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
                    <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
                  </web-ui-segmented>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <web-ui-button variant="primary">Inner button</web-ui-button>
                <web-ui-input value="Inner input"></web-ui-input>
                <web-ui-switch checked></web-ui-switch>
              </div>

              <web-ui-theme
                appearance={innermostAppearance}
                motion={innermostMotion}
                className="mt-4 block rounded-xl border border-(--wui-color-border) p-6"
              >
                <section className="bg-(--wui-color-page)">
                  <p className="mb-2 text-xs text-(--wui-color-text-secondary)">Innermost (toggleable)</p>
                  <div className="mb-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-(--wui-color-text-secondary)">Innermost appearance</span>
                      <web-ui-segmented
                        value={innermostAppearance}
                        onInput={updateInnermostAppearance}
                        aria-label="Innermost theme appearance"
                      >
                        <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
                        <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
                      </web-ui-segmented>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-(--wui-color-text-secondary)">Innermost motion</span>
                      <web-ui-segmented
                        value={innermostMotion}
                        onInput={updateInnermostMotion}
                        aria-label="Innermost theme motion preference"
                      >
                        <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
                        <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
                        <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
                      </web-ui-segmented>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <web-ui-button variant="primary">Innermost button</web-ui-button>
                    <web-ui-switch checked></web-ui-switch>
                  </div>
                </section>
              </web-ui-theme>
            </section>
          </web-ui-theme>
        </section>
      </web-ui-theme>
    </div>
  )
}
export default ThemeDemo
