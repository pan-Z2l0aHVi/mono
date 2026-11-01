import { toast } from '@greypan/web-ui'
import { useEffect, useState } from 'react'

const DEMO_ID = 'demo-close'

export default function Demo() {
  const [last, setLast] = useState('—')

  useEffect(() => () => toast.clear(), [])

  function create() {
    setLast(`创建 ${toast.info('这条 toast 不会自动关闭', { id: DEMO_ID, duration: 0 })}`)
  }

  function closeOne() {
    toast.close(DEMO_ID)
    setLast(`toast.close(${DEMO_ID})`)
  }

  function clearAll() {
    toast.clear()
    setLast('toast.clear()')
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        <web-ui-button onClick={create}>创建一条</web-ui-button>
        <web-ui-button variant="secondary" onClick={closeOne}>
          关闭这一条
        </web-ui-button>
        <web-ui-button variant="secondary" onClick={clearAll}>
          清空全部
        </web-ui-button>
      </div>
      <output className="text-sm text-(--wui-color-text-secondary)">最近操作：{last}</output>
    </div>
  )
}
