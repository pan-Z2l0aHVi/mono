import { useState } from 'react'

export default function Demo() {
  const [rightOpen, setRightOpen] = useState(false)
  const [bottomOpen, setBottomOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <web-ui-button onClick={() => setRightOpen(true)}>右侧拖拽关闭</web-ui-button>
        <web-ui-button onClick={() => setBottomOpen(true)}>底部拖拽关闭</web-ui-button>
      </div>

      <web-ui-drawer
        open={rightOpen}
        draggable
        heading="向右拖拽关闭"
        onopen-change={event => setRightOpen(event.detail.open)}
      >
        <p>按住左缘的灰色胶囊，向右拖过半或快速甩动即可关闭。</p>
      </web-ui-drawer>

      <web-ui-drawer
        open={bottomOpen}
        placement="bottom"
        draggable
        heading="向下拖拽关闭"
        onopen-change={event => setBottomOpen(event.detail.open)}
      >
        <p>按住上缘的灰色胶囊，向下拖过半或快速甩动即可关闭。</p>
      </web-ui-drawer>
    </>
  )
}
