import { useState } from 'react'

export default function Demo() {
  const [rightOpen, setRightOpen] = useState(false)
  const [bottomOpen, setBottomOpen] = useState(false)
  const [fullOpen, setFullOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setRightOpen(true)}>右侧拖拽关闭</web-ui-button>
        <web-ui-button onClick={() => setBottomOpen(true)}>底部拖拽关闭</web-ui-button>
        <web-ui-button onClick={() => setFullOpen(true)}>右侧拖拽全屏</web-ui-button>
      </div>

      <web-ui-drawer
        open={rightOpen}
        draggable
        heading="向右拖拽关闭"
        onopen-change={event => setRightOpen(event.detail.open)}
      >
        <p>按住左缘的灰色胶囊，向右拖过阈值或快速甩动即可关闭。</p>
      </web-ui-drawer>

      <web-ui-drawer
        open={bottomOpen}
        placement="bottom"
        draggable
        heading="向下拖拽关闭"
        onopen-change={event => setBottomOpen(event.detail.open)}
      >
        <p>按住上缘的灰色胶囊，向下拖过阈值或快速甩动即可关闭。</p>
      </web-ui-drawer>

      <web-ui-drawer
        open={fullOpen}
        draggable
        fullable
        heading="向右拖拽全屏"
        onopen-change={event => setFullOpen(event.detail.open)}
      >
        <p>
          按住左缘的灰色胶囊向外（向左）拖过一段行程即吸附全屏；往回拉过恢复阈值会先恢复原尺寸，并让本次手势停在原尺寸。松手后重新拖过阈值或快速内甩才会关闭。
        </p>
      </web-ui-drawer>
    </>
  )
}
