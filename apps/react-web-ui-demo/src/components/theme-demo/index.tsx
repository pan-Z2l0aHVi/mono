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

  const updateAppearance = (event: React.FormEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isAppearance(value)) setAppearance(value)
  }
  const updateMotion = (event: React.FormEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isMotion(value)) setMotion(value)
  }
  const updateInnerAppearance = (event: React.FormEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isAppearance(value) && value !== 'system') setInnerAppearance(value)
  }
  const updateInnermostAppearance = (event: React.FormEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isAppearance(value) && value !== 'system') setInnermostAppearance(value)
  }
  const updateInnerMotion = (event: React.FormEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isMotion(value)) setInnerMotion(value)
  }
  const updateInnermostMotion = (event: React.FormEvent<WebUiSegmented>) => {
    const value = event.currentTarget.value
    if (isMotion(value)) setInnermostMotion(value)
  }

  return (
    <div>
      <h1>Theme</h1>
      <p className="mb-4 text-[var(--wui-color-text-secondary)]">
        web-ui-theme 支持多层嵌套，每一层独立控制外观与动效。内层主题优先于外层。
      </p>

      <h2>基本用法（单层）</h2>
      <h3>外观</h3>
      <div className="mb-4">
        <web-ui-segmented value={appearance} onInput={updateAppearance} aria-label="单层主题外观">
          <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
      <h3>动效偏好</h3>
      <div className="mb-4">
        <web-ui-segmented value={motion} onInput={updateMotion} aria-label="单层主题动效偏好">
          <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>

      <web-ui-theme
        appearance={appearance}
        motion={motion}
        className="block rounded-xl border p-6"
        style={{ borderColor: 'var(--wui-color-border)' } as React.CSSProperties}
      >
        <section style={{ background: 'var(--wui-color-page)' }}>
          <div className="flex flex-wrap gap-3">
            <web-ui-button variant="primary">Primary</web-ui-button>
            <web-ui-button variant="secondary">Secondary</web-ui-button>
            <web-ui-button variant="danger">Danger</web-ui-button>
            <web-ui-input value="Theme scope"></web-ui-input>
            <web-ui-switch checked></web-ui-switch>
          </div>

          <h3>浮层继承</h3>
          <p className="mb-3 text-sm text-[var(--wui-color-text-secondary)]">
            Portal Select、Toast 与 Dialog 均继承当前主题范围的外观和动效 token。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <web-ui-select
              value={scopedSelectValue}
              portal
              aria-label="主题范围 Portal Select"
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
                  m.toast.info('Toast 会挂载到当前 theme scope 的 overlay root。', {
                    heading: 'Scoped toast',
                    duration: 3000
                  })
                )
              }}
            >
              显示 Toast
            </web-ui-button>
            <web-ui-button variant="secondary" onClick={() => setScopedDialogOpen(true)}>
              打开 Dialog
            </web-ui-button>
          </div>

          <web-ui-dialog open={scopedDialogOpen} onopen-change={event => setScopedDialogOpen(event.detail.open)}>
            <span slot="title">Scoped dialog</span>
            Dialog 位于原生 top layer，仍继承当前 theme scope 的颜色与动效 token。
            <web-ui-button slot="footer" variant="primary" full onClick={() => setScopedDialogOpen(false)}>
              关闭
            </web-ui-button>
          </web-ui-dialog>
        </section>
      </web-ui-theme>

      <h2>多层嵌套</h2>
      <p className="mb-4 text-sm text-[var(--wui-color-text-secondary)]">
        外层 Light / Reduced → 内层 Dark / Full → 最内层 Light / System，每层独立控制，互不干扰。
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--wui-color-text-secondary)]">内层外观</span>
          <web-ui-segmented value={innerAppearance} onInput={updateInnerAppearance} aria-label="内层主题外观">
            <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
          </web-ui-segmented>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--wui-color-text-secondary)]">最内层外观</span>
          <web-ui-segmented value={innermostAppearance} onInput={updateInnermostAppearance} aria-label="最内层主题外观">
            <web-ui-segmented-trigger value="light">Light</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="dark">Dark</web-ui-segmented-trigger>
          </web-ui-segmented>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--wui-color-text-secondary)]">内层动效</span>
          <web-ui-segmented value={innerMotion} onInput={updateInnerMotion} aria-label="内层主题动效偏好">
            <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
          </web-ui-segmented>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--wui-color-text-secondary)]">最内层动效</span>
          <web-ui-segmented value={innermostMotion} onInput={updateInnermostMotion} aria-label="最内层主题动效偏好">
            <web-ui-segmented-trigger value="system">System</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="full">Full</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="reduced">Reduced</web-ui-segmented-trigger>
          </web-ui-segmented>
        </div>
      </div>

      <web-ui-theme
        appearance="light"
        motion="reduced"
        className="block rounded-xl border p-6"
        style={{ borderColor: 'var(--wui-color-border)' } as React.CSSProperties}
      >
        <section style={{ background: 'var(--wui-color-page)' }}>
          <p className="mb-2 text-xs text-[var(--wui-color-text-secondary)]">外层（Light / Reduced）</p>
          <div className="flex flex-wrap gap-3">
            <web-ui-button variant="primary">外层按钮</web-ui-button>
            <web-ui-switch checked></web-ui-switch>
          </div>

          <web-ui-theme
            appearance={innerAppearance}
            motion={innerMotion}
            className="mt-4 block rounded-xl border p-6"
            style={{ borderColor: 'var(--wui-color-border)' } as React.CSSProperties}
          >
            <section style={{ background: 'var(--wui-color-page)' }}>
              <p className="mb-2 text-xs text-[var(--wui-color-text-secondary)]">内层（可切换）</p>
              <div className="flex flex-wrap gap-3">
                <web-ui-button variant="primary">内层按钮</web-ui-button>
                <web-ui-input value="内层输入"></web-ui-input>
                <web-ui-switch checked></web-ui-switch>
              </div>

              <web-ui-theme
                appearance={innermostAppearance}
                motion={innermostMotion}
                className="mt-4 block rounded-xl border p-6"
                style={{ borderColor: 'var(--wui-color-border)' } as React.CSSProperties}
              >
                <section style={{ background: 'var(--wui-color-page)' }}>
                  <p className="mb-2 text-xs text-[var(--wui-color-text-secondary)]">最内层（可切换）</p>
                  <div className="flex flex-wrap gap-3">
                    <web-ui-button variant="primary">最内层按钮</web-ui-button>
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
