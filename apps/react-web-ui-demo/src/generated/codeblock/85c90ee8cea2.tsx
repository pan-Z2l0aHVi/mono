import { useState } from 'react'

export default function Demo() {
  const [first, setFirst] = useState(false)
  const [second, setSecond] = useState(false)

  return (
    <>
      <web-ui-button onClick={() => setFirst(true)}>打开第 1 层</web-ui-button>

      <web-ui-drawer open={first} pageShift heading="第 1 层" onopen-change={event => setFirst(event.detail.open)}>
        <p>同级 drawer 也按打开先后自动嵌套：先打开的让开最多，后打开的让开更少。</p>
        <web-ui-button slot="footer" variant="secondary" full onClick={() => setSecond(true)}>
          打开同级第 2 层
        </web-ui-button>
      </web-ui-drawer>

      <web-ui-drawer open={second} pageShift heading="第 2 层" onopen-change={event => setSecond(event.detail.open)}>
        <p>这一层与上一层是兄弟节点，视觉上仍退后一层、页面继续让开；关闭它，页面回落到前一层的位置。</p>
      </web-ui-drawer>
    </>
  )
}
