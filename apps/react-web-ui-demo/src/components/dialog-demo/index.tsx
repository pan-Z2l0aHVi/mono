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
      <h1>对话框</h1>
      <h2>命令式</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => dialogRef.current?.showModal()}>打开对话框</web-ui-button>
      </div>
      <web-ui-dialog ref={dialogRef}>
        <span slot="title">Save this message as a draft?</span>
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

      <h2>声明式</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible1(true)}>打开对话框</web-ui-button>
      </div>
      <web-ui-dialog open={visible1} onopen-change={event => setVisible1(event.detail.open)}>
        <span slot="title">Save this message as a draft?</span>
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

      <h2>滚动锁定</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible3(true)}>打开不锁定滚动的对话框</web-ui-button>
      </div>
      <web-ui-dialog open={visible3} noScrollLock onopen-change={event => setVisible3(event.detail.open)}>
        <span slot="title">可滚动背景</span>
        此对话框关闭滚动锁定，仍保留原生模态焦点行为。
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setVisible3(false)}>
          关闭
        </web-ui-button>
      </web-ui-dialog>

      <h2>横向按钮</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible2(true)}>打开横向对话框</web-ui-button>
      </div>
      <web-ui-dialog open={visible2} {...{ horizontal: true }} onopen-change={event => setVisible2(event.detail.open)}>
        <span slot="title">Save this message as a draft?</span>
        This message has not been sent and contains unsaved changes.
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setVisible2(false)}>
          Cancel
        </web-ui-button>
        <web-ui-button slot="footer" variant="primary" full>
          Save
        </web-ui-button>
      </web-ui-dialog>

      <h2>自定义内容（body slot）</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible4(true)}>打开自定义对话框</web-ui-button>
      </div>
      <web-ui-dialog open={visible4} onopen-change={event => setVisible4(event.detail.open)}>
        <div slot="body" style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 48 }}>🎉</p>
          <p style={{ margin: '12px 0 4px', fontSize: 18, fontWeight: 600 }}>操作成功</p>
          <p style={{ margin: '0 0 20px', color: '#6a6a6a' }}>自定义 body slot 内容，保留玻璃卡片外壳。</p>
          <web-ui-button variant="primary" full onClick={() => setVisible4(false)}>
            知道了
          </web-ui-button>
        </div>
      </web-ui-dialog>

      <h2>不可点击遮罩关闭</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setVisible5(true)}>打开</web-ui-button>
      </div>
      <web-ui-dialog open={visible5} noBackdropClose onopen-change={event => setVisible5(event.detail.open)}>
        <span slot="title">确认操作</span>
        <p>此对话框禁止点击遮罩关闭，必须通过按钮操作。</p>
        <web-ui-button slot="footer" variant="primary" full onClick={() => setVisible5(false)}>
          确认
        </web-ui-button>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setVisible5(false)}>
          取消
        </web-ui-button>
      </web-ui-dialog>

      <h2>自定义背景色</h2>
      <div className="mb-3 flex gap-2">
        <web-ui-button onClick={() => setBgVisible(true)}>打开对话框</web-ui-button>
      </div>
      <web-ui-dialog
        open={bgVisible}
        onopen-change={event => setBgVisible(event.detail.open)}
        style={{ '--wui-dialog-bg': 'rgb(240 248 255 / 0.92)' } as React.CSSProperties}
      >
        <span slot="title">自定义背景色</span>
        <p>
          通过 <code>--wui-dialog-bg</code> CSS 自定义属性覆盖玻璃卡片背景。
        </p>
        <web-ui-button slot="footer" variant="primary" full onClick={() => setBgVisible(false)}>
          确定
        </web-ui-button>
      </web-ui-dialog>
    </div>
  )
}
export default DialogDemo
