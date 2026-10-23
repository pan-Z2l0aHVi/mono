import { useState } from 'react'

export default function Demo() {
  const [open, setOpen] = useState([false, false, false])

  function setAt(index: number, value: boolean) {
    setOpen(current => current.map((item, i) => (i === index ? value : item)))
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {open.map((_, index) => (
          <web-ui-button key={index} onClick={() => setAt(index, true)}>
            打开 drawer {index + 1}
          </web-ui-button>
        ))}
      </div>

      {open.map((value, index) => (
        <web-ui-drawer
          key={index}
          open={value}
          heading={`同级 drawer ${index + 1}`}
          closable
          onopen-change={event => setAt(index, event.detail.open)}
        >
          <p>第 {index + 1} 个同级 drawer。打开下一个，观察这一层缩放并让出边缘。</p>
        </web-ui-drawer>
      ))}
    </>
  )
}
