import { useState } from 'react'

function SwitchDemo() {
  const [enabled, setEnabled] = useState(false)

  return (
    <div>
      <h1>开关</h1>
      <h2>基本用法</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-switch checked={enabled} onChange={event => setEnabled(event.currentTarget.checked)} />
        <span className="text-sm text-muted-strong">{enabled ? '开启' : '关闭'}</span>
      </div>
      <p className="text-xs text-muted-soft">💡 支持轻点即时切换、全轨道平滑拖拽与抛掷（Flick）切换</p>
      <h2>禁用状态</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-switch checked disabled />
        <span className="text-sm text-muted">禁用</span>
      </div>
      <h2>加载中</h2>
      <div className="mb-3 flex items-center gap-3">
        <web-ui-switch checked loading />
        <span className="text-sm text-muted">加载中</span>
      </div>
    </div>
  )
}
export default SwitchDemo
