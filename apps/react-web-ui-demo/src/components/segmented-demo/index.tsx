import { useState } from 'react'

function SegmentedDemo() {
  const [basicVal, setBasicVal] = useState('mon')
  const [groupVal, setGroupVal] = useState('banana')
  const [disabledVal, setDisabledVal] = useState('apple')
  const [insetVal, setInsetVal] = useState('banana')
  const [raisedVal, setRaisedVal] = useState('banana')

  return (
    <div>
      <h1>分段控制器</h1>
      <h2>基本用法</h2>
      <div className="mb-3">
        <web-ui-segmented value={basicVal} onInput={event => setBasicVal(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="mon">周一</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="tue">周二</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="wed">周三</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="thu">周四</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="fri">周五</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
      <p className="text-sm text-gray-500">选中值：{basicVal}</p>
      <p className="text-xs text-gray-400">💡 支持按住当前选中项平滑拖拽跟踪、松手吸附至最近选项及抛掷手势</p>

      <h2>禁用状态</h2>
      <div className="mb-3">
        <web-ui-segmented disabled value={disabledVal} onInput={event => setDisabledVal(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
      <p className="text-sm text-gray-500">选中值：{disabledVal}</p>

      <h2>Segmented Group</h2>
      <div className="mb-3">
        <web-ui-segmented value={groupVal} onInput={event => setGroupVal(event.currentTarget.value)}>
          <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>
      <p className="text-sm text-gray-500">选中值：{groupVal}</p>

      <h2>变体</h2>
      <p className="mb-3 text-sm text-gray-500">variant 控制轨道与静止指示器材质，默认 inset。</p>
      <div className="mb-3 flex flex-wrap gap-8">
        <div>
          <p className="mb-1 text-sm text-gray-500">variant=&quot;inset&quot;（默认）</p>
          <web-ui-segmented value={insetVal} onInput={event => setInsetVal(event.currentTarget.value)}>
            <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
          </web-ui-segmented>
          <p className="mt-1 text-sm text-gray-500">选中值：{insetVal}</p>
        </div>
        <div>
          <p className="mb-1 text-sm text-gray-500">variant=&quot;raised&quot;</p>
          <web-ui-segmented
            variant="raised"
            value={raisedVal}
            onInput={event => setRaisedVal(event.currentTarget.value)}
          >
            <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
            <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
          </web-ui-segmented>
          <p className="mt-1 text-sm text-gray-500">选中值：{raisedVal}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400">💡 两种 variant 的按压/拖拽指示器同为透明玻璃（backdrop blur、1.5x 缩放）</p>
    </div>
  )
}
export default SegmentedDemo
