import { toast, type WebUiButton, type WebUiTheme } from '@greypan/web-ui'
import { useRef, useState } from 'react'

export default function Demo() {
  const theme = useRef<WebUiTheme>(null)
  const toastTarget = useRef<WebUiButton>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [report, setReport] = useState('Not read yet')

  return (
    <web-ui-theme ref={theme} appearance="dark">
      <div className="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <div className="flex flex-wrap items-center gap-2">
          <web-ui-select portal placeholder="Portal select" aria-label="Select mounted into the scope overlay root">
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
              toast.info("This toast mounts into the sample's own overlay root.", {
                heading: 'Scoped toast',
                duration: 3000,
                target: toastTarget.current ?? undefined
              })
            }
          >
            Show toast
          </web-ui-button>
          <web-ui-button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open dialog
          </web-ui-button>
          <web-ui-button
            variant="ghost"
            onClick={() =>
              setReport(
                theme.current?.getOverlayRoot()
                  ? 'getOverlayRoot() returns an element'
                  : 'getOverlayRoot() returns undefined'
              )
            }
          >
            Read overlay root
          </web-ui-button>
        </div>
        <output className="mt-2 block text-sm text-(--wui-color-text-secondary)">{report}</output>

        <web-ui-dialog
          open={dialogOpen}
          heading="Scoped dialog"
          onopen-change={event => setDialogOpen(event.detail.open)}
        >
          The dialog sits in the native top layer; color and motion tokens are still inherited from this layer.
          <web-ui-button slot="footer" variant="primary" full onClick={() => setDialogOpen(false)}>
            Close
          </web-ui-button>
        </web-ui-dialog>
      </div>
    </web-ui-theme>
  )
}
