import type { WebUiDialog } from '@greypan/web-ui'
import { useRef, useState } from 'react'

function DialogDemo() {
  const dialogRef = useRef<WebUiDialog>(null)
  const [visible1, setVisible1] = useState(false)
  const [visible2, setVisible2] = useState(false)
  const [visible3, setVisible3] = useState(false)
  const [visible4, setVisible4] = useState(false)
  const [visible5, setVisible5] = useState(false)
  const [bgVisible, setBgVisible] = useState(false)

  return (
    <div>
      <h1>dialog</h1>
      <h2>Imperative</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => dialogRef.current?.showModal()}>Open a dialog</web-ui-button>
      </div>
      <web-ui-dialog ref={dialogRef}>
        <span slot="header">Save this message as a draft?</span>
        This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
        <web-ui-button slot="footer" variant="primary" full>
          Save
        </web-ui-button>
        <web-ui-button slot="footer" variant="danger" full>
          Don&apos;t Save
        </web-ui-button>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => dialogRef.current?.close()}>
          Cancel
        </web-ui-button>
      </web-ui-dialog>

      <h2>Declarative</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible1(true)}>Open a dialog</web-ui-button>
      </div>
      <web-ui-dialog open={visible1} onopen-change={event => setVisible1(event.detail.open)}>
        <span slot="header">Save this message as a draft?</span>
        This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
        <web-ui-button slot="footer" variant="primary" full>
          Save
        </web-ui-button>
        <web-ui-button slot="footer" variant="danger" full>
          Don&apos;t Save
        </web-ui-button>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setVisible1(false)}>
          Cancel
        </web-ui-button>
      </web-ui-dialog>

      <h2>Scroll lock</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible3(true)}>Open a dialog without scroll lock</web-ui-button>
      </div>
      <web-ui-dialog open={visible3} noScrollLock onopen-change={event => setVisible3(event.detail.open)}>
        <span slot="header">Scrollable background</span>
        此 dialog 关闭滚动锁定，仍保留原生模态焦点行为。
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setVisible3(false)}>
          Close
        </web-ui-button>
      </web-ui-dialog>

      <h2>Horizontal button</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible2(true)}>Open a horizontal dialog</web-ui-button>
      </div>
      <web-ui-dialog open={visible2} {...{ horizontal: true }} onopen-change={event => setVisible2(event.detail.open)}>
        <span slot="header">Save this message as a draft?</span>
        This message has not been sent and contains unsaved changes.
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setVisible2(false)}>
          Cancel
        </web-ui-button>
        <web-ui-button slot="footer" variant="primary" full>
          Save
        </web-ui-button>
      </web-ui-dialog>

      <h2>Custom content (headless)</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible4(true)}>Open a custom dialog</web-ui-button>
      </div>
      <web-ui-dialog
        headless
        dialogLabel="Custom dialog"
        open={visible4}
        onopen-change={event => setVisible4(event.detail.open)}
      >
        <div className="text-center">
          <p className="m-0 text-[48px]">🎉</p>
          <p className="mx-0 mt-3 mb-1 text-lg font-semibold">Done</p>
          <p className="mx-0 mb-5 text-[#6a6a6a]">
            headless: the content goes through the default slot; the overlay infrastructure stays and the built-in
            chrome is dropped.
          </p>
          <web-ui-button variant="primary" full onClick={() => setVisible4(false)}>
            Got it
          </web-ui-button>
        </div>
      </web-ui-dialog>

      <h2>Backdrop click does not close</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible5(true)}>Open</web-ui-button>
      </div>
      <web-ui-dialog open={visible5} noBackdropClose onopen-change={event => setVisible5(event.detail.open)}>
        <span slot="header">Confirm</span>
        <p>This dialog does not close on a backdrop click; use the button instead.</p>
        <web-ui-button slot="footer" variant="primary" full onClick={() => setVisible5(false)}>
          Confirm
        </web-ui-button>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setVisible5(false)}>
          Cancel
        </web-ui-button>
      </web-ui-dialog>

      <h2>Custom background color</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setBgVisible(true)}>Open a dialog</web-ui-button>
      </div>
      <web-ui-dialog
        open={bgVisible}
        onopen-change={event => setBgVisible(event.detail.open)}
        className="[--wui-dialog-bg:rgb(240_248_255/0.92)]"
      >
        <span slot="header">Custom background color</span>
        <p>
          Through<code>--wui-dialog-bg</code>CSS custom properties override the glass card background.
        </p>
        <web-ui-button slot="footer" variant="primary" full onClick={() => setBgVisible(false)}>
          OK
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
export default DialogDemo
