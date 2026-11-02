import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState(false)
  const [rejected, setRejected] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setOpen(true)}>打开受控 drawer</web-ui-button>

      <web-ui-drawer
        open={open}
        controlled
        heading="受控关闭"
        onopen-change={event => {
          if (event.detail.open) {
            setRejected(false)
            setOpen(true)
            return
          }
          // 不回写 open：drawer 会弹回打开位，消费方因此可以拒绝这次关闭。
          setRejected(true)
        }}
      >
        <p>按 Escape、点遮罩或关闭按钮只会发出关闭请求。</p>
        {rejected ? <p className="text-(--wui-color-danger)">已拒绝关闭请求；请先确认。</p> : null}
        <web-ui-button
          slot="footer"
          variant="secondary"
          full
          onClick={() => {
            setRejected(false)
            setOpen(false)
          }}
        >
          确认关闭
        </web-ui-button>
      </web-ui-drawer>
    </>
  )
}
