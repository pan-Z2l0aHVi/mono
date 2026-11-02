import { toast, type WebUiButton, type WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const toastTarget = useRef<WebUiButton>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [report, setReport] = useState('还没读取')

  return (
    <web-ui-theme ref={theme} appearance="dark">
      <div className="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-wrap items-center gap-2">
          <web-ui-select portal placeholder="Portal select" aria-label="挂进作用域 overlay root 的 select">
            <web-ui-option value="portal" label="Portal overlay">
              Portal overlay
            </web-ui-option>
            <web-ui-option value="token" label="Theme token">
              Theme token
            </web-ui-option>
          </web-ui-select>
          <web-ui-button
            ref={toastTarget}
            variant="secondary"
            onClick={() =>
              toast.info('这条 toast 挂进示例自己的 overlay root。', {
                heading: '作用域 toast',
                duration: 3000,
                target: toastTarget.current ?? undefined
              })
            }
          >
            显示 toast
          </web-ui-button>
          <web-ui-button variant="secondary" onClick={() => setDialogOpen(true)}>
            打开 dialog
          </web-ui-button>
          <web-ui-button
            variant="ghost"
            onClick={() =>
              setReport(
                theme.current?.getOverlayRoot() ? 'getOverlayRoot() 返回元素' : 'getOverlayRoot() 返回 undefined'
              )
            }
          >
            读取 overlay root
          </web-ui-button>
        </div>
        <output className="mt-2 block text-sm text-(--wui-color-text-secondary)">{report}</output>

        <web-ui-dialog
          open={dialogOpen}
          heading="作用域 dialog"
          onopen-change={event => setDialogOpen(event.detail.open)}
        >
          dialog 在原生 top layer，颜色与动效 token 仍从这一层继承。
          <web-ui-button slot="footer" variant="primary" full onClick={() => setDialogOpen(false)}>
            关闭
          </web-ui-button>
        </web-ui-dialog>
      </div>
    </web-ui-theme>
  )
}
