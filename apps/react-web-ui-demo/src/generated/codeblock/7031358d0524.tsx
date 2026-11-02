import { WebUiSpinner } from '@greypan/web-ui'

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <web-ui-button onClick={() => WebUiSpinner.show()}>show()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.hide()}>hide()</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 16 })}>小（16px）</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ size: 64, duration: 2000 })}>大（64px）</web-ui-button>
      <web-ui-button onClick={() => WebUiSpinner.show({ description: '正在同步云端文件，约 10 秒', duration: 10000 })}>
        带说明，10 秒
      </web-ui-button>
    </div>
  )
}
