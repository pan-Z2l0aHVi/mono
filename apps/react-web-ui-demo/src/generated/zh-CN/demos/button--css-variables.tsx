import { lucideUpload } from '@greypan/web-ui/icons'
import type { CSSProperties } from 'react'

const successOnly = { '--wui-button-bg': 'var(--wui-color-success)' } as CSSProperties

const fourStates = {
  '--wui-button-color': 'var(--wui-color-on-accent)',
  '--wui-button-bg': 'var(--wui-color-success)',
  '--wui-button-bg-hover': 'var(--wui-color-accent)',
  '--wui-button-bg-active': 'var(--wui-color-warning)'
} as CSSProperties

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" className="[--wui-button-px:28px] [--wui-button-gap:14px]">
        <web-ui-icon slot="prefix" icon={lucideUpload} size={16}></web-ui-icon>
        内边距与插槽间距都放宽
      </web-ui-button>
      <web-ui-button variant="primary" style={successOnly}>
        只换底色，hover 与按下跟着变深
      </web-ui-button>
      <web-ui-button variant="secondary" style={fourStates}>
        四档配色各指一枚 token
      </web-ui-button>
    </div>
  )
}
